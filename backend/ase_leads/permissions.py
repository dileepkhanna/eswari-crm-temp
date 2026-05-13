"""
Permission classes for ASE Marketing Panel.

Defines role-based access control for the ASE Technologies marketing team.
Access is gated at two levels:

  1. View-level (has_permission): Determines whether the user is allowed to
     reach the endpoint at all — authentication, company membership, and team
     assignment are checked here.

  2. Object-level (has_object_permission): Determines whether the user may
     interact with a *specific* lead — enforced by matching the lead's current
     status against the statuses that belong to the user's stage in the
     marketing pipeline.

Lead lifecycle and role ownership
──────────────────────────────────
  new  ──►  qualified  ──►  contacted  ──►  proposal_sent  ──►  negotiating  ──►  won / lost
  └── BRE ──┘           └──── BOE ────┘    └──────────────── CRE ──────────────┘

  • BRE  owns the top of the funnel: they research raw leads and decide whether
    to qualify or disqualify them before handing off to BOE.
  • BOE  owns the outreach phase: they call and email qualified leads, log every
    interaction, and move warm leads forward to CRE.
  • CRE  owns the closing phase: they send proposals, schedule meetings, and
    shepherd deals through negotiation to a win or loss.
  • Marketing Lead has visibility across the entire funnel so they can manage
    the team, reassign leads, and track overall pipeline health.
  • Admin bypasses all role checks — they can access every lead and every
    dashboard regardless of company or team assignment.
"""

from rest_framework.permissions import BasePermission


class ASEMarketingPermission(BasePermission):
    """
    Permission class for ASE Marketing roles.

    Access Control Matrix
    ─────────────────────
    Role              | View-level gate                        | Lead statuses accessible
    ──────────────────┼────────────────────────────────────────┼──────────────────────────────────────────
    admin             | Always passes (no company/team check)  | All statuses
    marketing_lead    | ASE company + marketing_lead category  | All statuses
    BRE               | ASE company + bre category             | new, qualified
    BOE               | ASE company + boe category             | qualified, contacted, nurturing
    CRE               | ASE company + cre category             | contacted, proposal_sent, negotiating
    ──────────────────┴────────────────────────────────────────┴──────────────────────────────────────────

    Company Restriction
    ───────────────────
    Non-admin users must belong to ASE Technologies (company code 'ASE' or
    'ASE_TECH'). This prevents users from other companies (e.g. Eswari Group)
    from accidentally reaching ASE marketing data even if they share the same
    Django instance.

    Team / Category Restriction
    ───────────────────────────
    Non-admin users must be assigned to a team whose `marketing_category` field
    is set. A user who belongs to ASE Technologies but is on the Technical Team
    (or has no team at all) will be denied at the view level.
    """

    def has_permission(self, request, view):
        """
        View-level gate — called once per request before the view handler runs.

        Decision tree:
          1. Reject unauthenticated requests immediately (HTTP 401 territory).
          2. Grant admin users unconditional access — they need no company or
             team assignment because they manage the whole system.
          3. For everyone else, enforce two membership checks:
             a. Company check  — user.company.code must be 'ASE' or 'ASE_TECH'.
             b. Category check — user.team.marketing_category must be truthy,
                meaning the team has been explicitly tagged as a marketing team.

        Returns True only when all applicable checks pass.
        """
        # ── 1. Authentication gate ────────────────────────────────────────────
        # DRF will return HTTP 401 if the user is not authenticated at all.
        # We check this first so subsequent attribute accesses are safe.
        if not request.user.is_authenticated:
            return False

        # ── 2. Admin short-circuit ────────────────────────────────────────────
        # Admins manage the entire CRM and must not be blocked by company or
        # team constraints. Return True immediately to skip all further checks.
        if request.user.role == 'admin':
            return True

        # ── 2b. Manager short-circuit ─────────────────────────────────────────
        # Managers oversee marketing teams and need access to marketing data
        # for their company. They bypass the team/category check but still
        # require company membership.
        if request.user.role == 'manager':
            if not hasattr(request.user, 'company') or request.user.company is None:
                return False
            return request.user.company.code in ['ASE', 'ASE_TECH']

        # ── 3a. Company membership check ──────────────────────────────────────
        # The `company` attribute is set by the user profile; it may be absent
        # on freshly created accounts, so we guard with hasattr before accessing
        # `.code`. Users without a company, or from a different company, are
        # denied here rather than at the object level to avoid leaking the
        # existence of leads in the response.
        if not hasattr(request.user, 'company') or request.user.company is None:
            return False

        if request.user.company.code not in ['ASE', 'ASE_TECH']:
            return False

        # ── 3b. Marketing team category check ────────────────────────────────
        # A user can belong to ASE Technologies but be on a non-marketing team
        # (e.g. Technical Team). We require `team.marketing_category` to be set
        # so that only users explicitly placed in a marketing role can proceed.
        if not hasattr(request.user, 'team') or request.user.team is None:
            return False

        if not request.user.team.marketing_category:
            return False

        return True

    def has_object_permission(self, request, view, obj):
        """
        Object-level gate — called for each individual lead instance.

        This method enforces the pipeline stage boundaries described in the
        class docstring. Each role is only permitted to see leads whose status
        falls within their stage of the funnel. This prevents, for example, a
        BOE user from reading a lead that is still in the 'new' (BRE) stage or
        one that has already reached 'proposal_sent' (CRE territory).

        Why object-level and not just queryset filtering?
        ─────────────────────────────────────────────────
        Queryset filtering in the view already narrows the list endpoints, but
        object-level permission provides a second, independent enforcement layer
        for detail/action endpoints (e.g. /api/ase-leads/{id}/qualify/). This
        means a BOE user who guesses a lead ID cannot call a BRE-only action on
        it even if they construct the URL manually.

        Decision tree:
          1. Admin → always True.
          2. Resolve marketing_category from the user's team.
          3. marketing_lead → always True (manages the whole funnel).
          4. BRE  → True only for 'new' or 'qualified' leads.
          5. BOE  → True only for 'qualified', 'contacted', or 'nurturing' leads.
          6. CRE  → True only for 'contacted', 'proposal_sent', or 'negotiating'.
          7. Any unrecognised category → False (fail-safe default).
        """
        user = request.user

        # ── 1. Admin short-circuit ────────────────────────────────────────────
        # Same reasoning as has_permission: admins bypass all role checks.
        if user.role == 'admin':
            return True

        # ── 1b. Manager short-circuit ─────────────────────────────────────────
        # Managers have full visibility across the marketing funnel.
        if user.role == 'manager':
            return True

        # ── 2. Resolve marketing category ────────────────────────────────────
        # `user.team` was already validated as non-None in has_permission, but
        # we guard defensively here in case has_object_permission is ever called
        # independently (e.g. in tests or custom view logic).
        marketing_category = user.team.marketing_category if user.team else None

        # ── 3. Marketing Lead — full funnel access ────────────────────────────
        # The team lead needs visibility across all stages to manage assignments,
        # review pipeline health, and step in on high-value deals.
        if marketing_category == 'marketing_lead':
            return True

        # ── 4. BRE — top-of-funnel (research & qualification) ─────────────────
        # BRE users work on raw incoming leads ('new') and leads they are still
        # evaluating ('qualified'). Once a lead moves past 'qualified' it has
        # been handed off to BOE and is no longer the BRE's concern.
        if marketing_category == 'bre':
            return obj.status in ['new', 'qualified']

        # ── 5. BOE — mid-funnel (outreach & engagement) ───────────────────────
        # BOE users pick up qualified leads, make contact, and nurture them.
        # They need access to 'qualified' (just handed over from BRE),
        # 'contacted' (actively being worked), and 'nurturing' (longer-cycle
        # leads that need repeated follow-up before moving to CRE).
        if marketing_category == 'boe':
            return obj.status in ['qualified', 'contacted', 'nurturing']

        # ── 6. CRE — bottom-of-funnel (proposals & closing) ──────────────────
        # CRE users take over once a lead has been contacted and shows genuine
        # interest. They handle 'contacted' (warm handoff from BOE),
        # 'proposal_sent' (proposal delivered, awaiting response), and
        # 'negotiating' (active deal discussion before win/loss).
        if marketing_category == 'cre':
            return obj.status in ['contacted', 'proposal_sent', 'negotiating']

        # ── 7. Fail-safe default ──────────────────────────────────────────────
        # Any marketing_category value not explicitly handled above (e.g. a
        # future role added to the database but not yet coded here) is denied.
        # This is intentionally conservative: it is safer to deny access and
        # require a code update than to accidentally grant it.
        return False
