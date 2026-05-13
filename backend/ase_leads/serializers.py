from rest_framework import serializers
from django.utils import timezone
from .models import ASELead
from .models.activity import ASELeadActivity
from .models.task import ASELeadTask


class UserBasicSerializer(serializers.Serializer):
    """
    Basic user information for nested serialization.
    Used wherever a user FK needs to be represented with human-readable fields
    rather than a bare integer ID.
    """
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    
    def to_representation(self, instance):
        if instance is None:
            return None
        # Get marketing category from team
        marketing_category = ''
        if hasattr(instance, 'team') and instance.team and hasattr(instance.team, 'marketing_category'):
            marketing_category = instance.team.marketing_category or ''
        return {
            'id': instance.id,
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
            'full_name': f"{instance.first_name} {instance.last_name}".strip() or instance.username,
            'role': instance.role if hasattr(instance, 'role') else '',
            'marketing_category': marketing_category.upper() if marketing_category else '',
        }


class ASELeadNestedSerializer(serializers.ModelSerializer):
    """
    Compact, read-only representation of an ASELead for embedding inside
    ASELeadActivity and ASELeadTask responses.

    Intentionally lightweight — only the fields needed to give context about
    the parent lead without causing deep nesting or N+1 issues.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assigned_to_details = UserBasicSerializer(source='assigned_to', read_only=True)

    class Meta:
        model = ASELead
        fields = [
            'id',
            'company_name',
            'contact_person',
            'email',
            'phone',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'engagement_level',
            'lead_score',
            'assigned_to',
            'assigned_to_details',
        ]
        read_only_fields = fields


class ASELeadSerializer(serializers.ModelSerializer):
    """
    Serializer for ASE Lead model with all new marketing team fields.

    Nested relationships included (all read-only):
    - researched_by_details / contacted_by_details / managed_by_details
      → UserBasicSerializer: human-readable user info for role assignments
    - recent_activities
      → last 5 activities on this lead (ASELeadActivityListSerializer)
    - pending_tasks
      → open/in-progress tasks for this lead (ASELeadTaskListSerializer)
    """
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    service_interests_display = serializers.ReadOnlyField()
    
    # Company information
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)
    
    # Make email optional
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    
    # Nested serializers for role assignments (read-only for display)
    researched_by_details = UserBasicSerializer(source='researched_by', read_only=True)
    contacted_by_details = UserBasicSerializer(source='contacted_by', read_only=True)
    managed_by_details = UserBasicSerializer(source='managed_by', read_only=True)
    
    # Read-only fields for role assignment names
    researched_by_name = serializers.SerializerMethodField()
    contacted_by_name = serializers.SerializerMethodField()
    managed_by_name = serializers.SerializerMethodField()

    # Nested activity and task summaries (detail view only)
    recent_activities = serializers.SerializerMethodField()
    pending_tasks = serializers.SerializerMethodField()

    # ── Computed / read-only properties ──────────────────────────────────────

    # Full display name for the primary contact
    contact_display = serializers.SerializerMethodField()

    # How many days since this lead was created
    days_since_created = serializers.SerializerMethodField()

    # How many days the lead has been in its current status
    # Approximated from the most recent workflow timestamp; falls back to
    # updated_at when no workflow timestamp is available.
    days_in_current_status = serializers.SerializerMethodField()

    # Whether the lead has been sitting in its current status too long
    # (thresholds: new/qualified → 7 days, contacted/nurturing → 14 days,
    #  proposal_sent/negotiating → 21 days, everything else → 30 days)
    is_overdue = serializers.SerializerMethodField()

    # Composite engagement score (0-100) derived from activity counts,
    # lead_score, engagement_level, and recency of last engagement.
    engagement_score = serializers.SerializerMethodField()

    # Human-readable pipeline stage label
    status_display = serializers.SerializerMethodField()

    def get_contact_display(self, obj):
        """Return a combined display string for the primary contact."""
        parts = []
        if obj.contact_person:
            parts.append(obj.contact_person)
        if obj.company_name:
            parts.append(f"({obj.company_name})")
        return " ".join(parts) if parts else None

    def get_days_since_created(self, obj):
        """Return the number of days since this lead was created."""
        if obj.created_at is None:
            return None
        delta = timezone.now() - obj.created_at
        return delta.days

    def get_days_in_current_status(self, obj):
        """
        Return the number of days the lead has been in its current status.

        Uses the most relevant workflow timestamp for the current status:
          - new          → created_at
          - qualified    → research_completed_at  (falls back to created_at)
          - contacted    → first_contact_at        (falls back to updated_at)
          - nurturing    → last_engagement_date    (falls back to updated_at)
          - proposal_sent→ proposal_sent_at        (falls back to updated_at)
          - negotiating  → proposal_sent_at        (falls back to updated_at)
          - won / lost   → deal_closed_at          (falls back to updated_at)
          - on_hold      → updated_at
        """
        status = obj.status
        reference_dt = None

        if status == 'new':
            reference_dt = obj.created_at
        elif status == 'qualified':
            reference_dt = obj.research_completed_at or obj.created_at
        elif status == 'contacted':
            reference_dt = obj.first_contact_at or obj.updated_at
        elif status == 'nurturing':
            reference_dt = obj.last_engagement_date or obj.updated_at
        elif status == 'proposal_sent':
            reference_dt = obj.proposal_sent_at or obj.updated_at
        elif status == 'negotiating':
            reference_dt = obj.proposal_sent_at or obj.updated_at
        elif status in ('won', 'lost'):
            reference_dt = obj.deal_closed_at or obj.updated_at
        else:
            reference_dt = obj.updated_at

        if reference_dt is None:
            return None
        delta = timezone.now() - reference_dt
        return max(delta.days, 0)

    def get_is_overdue(self, obj):
        """
        Return True when the lead has been in its current status longer than
        the allowed threshold for that status.

        Thresholds (in days):
          new / qualified          →  7
          contacted / nurturing    → 14
          proposal_sent            → 21
          negotiating              → 30
          won / lost / on_hold     → None (never overdue)
        """
        thresholds = {
            'new': 7,
            'qualified': 7,
            'contacted': 14,
            'nurturing': 14,
            'proposal_sent': 21,
            'negotiating': 30,
        }
        threshold = thresholds.get(obj.status)
        if threshold is None:
            return False
        days = self.get_days_in_current_status(obj)
        if days is None:
            return False
        return days > threshold

    def get_engagement_score(self, obj):
        """
        Compute a composite engagement score (0-100).

        Components:
          - lead_score (0-100)                    → 40 % weight
          - engagement_level                       → 20 % weight
            cold=0, warm=33, hot=67, very_hot=100
          - activity recency (last_engagement_date)→ 20 % weight
            0 days=100, 7 days=75, 14 days=50, 30+ days=0
          - activity volume                        → 20 % weight
            calls + emails + meetings, capped at 20 total → 100
        """
        # 1. Lead score component (0-100)
        lead_score_component = obj.lead_score or 0

        # 2. Engagement level component (0-100)
        engagement_map = {
            'cold': 0,
            'warm': 33,
            'hot': 67,
            'very_hot': 100,
        }
        engagement_level_component = engagement_map.get(obj.engagement_level or 'cold', 0)

        # 3. Recency component (0-100)
        recency_component = 0
        if obj.last_engagement_date:
            days_since = (timezone.now() - obj.last_engagement_date).days
            if days_since <= 0:
                recency_component = 100
            elif days_since <= 7:
                recency_component = 75
            elif days_since <= 14:
                recency_component = 50
            elif days_since <= 30:
                recency_component = 25
            else:
                recency_component = 0

        # 4. Activity volume component (0-100)
        total_activities = (
            (obj.total_calls_made or 0)
            + (obj.total_emails_sent or 0)
            + (obj.total_meetings_held or 0)
        )
        # Cap at 20 activities → 100 points
        volume_component = min(total_activities / 20.0 * 100, 100)

        # Weighted average
        score = (
            lead_score_component * 0.40
            + engagement_level_component * 0.20
            + recency_component * 0.20
            + volume_component * 0.20
        )
        return round(score, 1)

    def get_status_display(self, obj):
        """Return the human-readable label for the current status."""
        return obj.get_status_display()

    def get_researched_by_name(self, obj):
        """Get the BRE's full name"""
        if obj.researched_by:
            return f"{obj.researched_by.first_name} {obj.researched_by.last_name}".strip() or obj.researched_by.username
        return None
    
    def get_contacted_by_name(self, obj):
        """Get the BOE's full name"""
        if obj.contacted_by:
            return f"{obj.contacted_by.first_name} {obj.contacted_by.last_name}".strip() or obj.contacted_by.username
        return None
    
    def get_managed_by_name(self, obj):
        """Get the CRE's full name"""
        if obj.managed_by:
            return f"{obj.managed_by.first_name} {obj.managed_by.last_name}".strip() or obj.managed_by.username
        return None

    def get_recent_activities(self, obj):
        """
        Return the 5 most recent activities for this lead.
        Uses ASELeadActivityListSerializer (lightweight) to avoid deep nesting.
        Ordered by created_at descending (newest first).

        ASELeadActivityListSerializer is defined later in this module; because
        this is a SerializerMethodField the name is resolved at call time (not
        at class-definition time), so there is no forward-reference issue.
        """
        activities = obj.activities.select_related('user').order_by('-created_at')[:5]
        # ASELeadActivityListSerializer is defined later in this same module
        return ASELeadActivityListSerializer(activities, many=True).data

    def get_pending_tasks(self, obj):
        """
        Return all pending or in-progress tasks for this lead.
        Uses ASELeadTaskListSerializer (lightweight) to avoid deep nesting.
        Ordered by due_date ascending (most urgent first).

        ASELeadTaskListSerializer is defined later in this module; because
        this is a SerializerMethodField the name is resolved at call time (not
        at class-definition time), so there is no forward-reference issue.
        """
        tasks = obj.tasks.select_related('assigned_to').filter(
            status__in=['pending', 'in_progress']
        ).order_by('due_date')
        # ASELeadTaskListSerializer is defined later in this same module
        return ASELeadTaskListSerializer(tasks, many=True).data
    
    class Meta:
        model = ASELead
        fields = [
            'id',
            # Basic Information
            'company_name',
            'contact_person',
            'email',
            'phone',
            'website',
            
            # Business Information
            'industry',
            'company_size',
            'annual_revenue',
            
            # Marketing Information
            'service_interests',
            'service_interests_display',
            'custom_services',
            'current_marketing_spend',
            'budget_amount',
            
            # Current Marketing Status
            'has_website',
            'has_social_media',
            'current_seo_agency',
            'marketing_goals',
            
            # Lead Information
            'lead_source',
            'referral_source',
            
            # Status and Management
            'status',
            'priority',
            
            # Assignment and Company
            'company',
            'company_name_display',
            'company_code',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            
            # Role Assignment Fields (Marketing Team)
            'researched_by',
            'researched_by_name',
            'researched_by_details',
            'contacted_by',
            'contacted_by_name',
            'contacted_by_details',
            'managed_by',
            'managed_by_name',
            'managed_by_details',
            
            # Important Dates
            'first_contact_date',
            'last_contact_date',
            'next_follow_up',
            'proposal_sent_date',
            'contract_start_date',
            
            # Tracking Timestamp Fields (Marketing Team Workflow)
            'research_completed_at',
            'first_contact_at',
            'proposal_sent_at',
            'deal_closed_at',
            
            # Performance Metric Fields (Marketing Team Activity Tracking)
            'total_calls_made',
            'total_emails_sent',
            'total_meetings_held',
            'response_time_hours',
            
            # Qualification Fields (BRE Research & Qualification)
            'lead_score',
            'qualification_notes',
            'disqualification_reason',
            
            # Engagement Tracking Fields
            'engagement_level',
            'last_engagement_type',
            'last_engagement_date',
            
            # Financial Information
            'estimated_project_value',
            'monthly_retainer',
            
            # Notes and Communication
            'notes',
            'communication_log',
            
            # Metadata
            'created_at',
            'updated_at',

            # ── Computed / read-only properties ──────────────────────────────
            'contact_display',
            'days_since_created',
            'days_in_current_status',
            'is_overdue',
            'engagement_score',
            'status_display',

            # ── Nested relationship data (detail view) ────────────────────────
            'recent_activities',
            'pending_tasks',
        ]
        read_only_fields = [
            'created_by', 
            'created_at', 
            'updated_at',
            'researched_by_name',
            'researched_by_details',
            'contacted_by_name',
            'contacted_by_details',
            'managed_by_name',
            'managed_by_details',
            # Computed properties
            'contact_display',
            'days_since_created',
            'days_in_current_status',
            'is_overdue',
            'engagement_score',
            'status_display',
            # Nested relationship data
            'recent_activities',
            'pending_tasks',
        ]
    
    def validate_phone(self, value):
        request = self.context.get('request')
        company = None
        if request and hasattr(request.user, 'company'):
            company = request.user.company
        if company and value:
            qs = ASELead.objects.filter(phone=value, company=company)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"A lead with phone number '{value}' already exists in your company."
                )
        return value
    
    def validate_email(self, value):
        """
        Custom email validation to handle empty strings and None values.
        """
        # If email is None, empty string, or just whitespace, return None
        if not value or not value.strip():
            return None
        # Otherwise, let the EmailField validator handle it
        return value.strip()
    
    def validate_lead_score(self, value):
        """
        Validate lead_score is within 0-100 range
        """
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError(
                "Lead score must be between 0 and 100."
            )
        return value
    
    def validate_engagement_level(self, value):
        """
        Validate engagement_level is one of the allowed choices
        """
        valid_choices = ['cold', 'warm', 'hot', 'very_hot']
        if value and value not in valid_choices:
            raise serializers.ValidationError(
                f"Engagement level must be one of: {', '.join(valid_choices)}"
            )
        return value
    
    def validate(self, attrs):
        """
        Object-level validation
        """
        # Validate that if disqualification_reason is provided, status should be 'lost'
        disqualification_reason = attrs.get('disqualification_reason')
        status = attrs.get('status', self.instance.status if self.instance else None)
        
        if disqualification_reason and status != 'lost':
            raise serializers.ValidationError({
                'disqualification_reason': 'Disqualification reason can only be set when status is "lost".'
            })
        
        # Validate that performance metrics are non-negative
        for field in ['total_calls_made', 'total_emails_sent', 'total_meetings_held']:
            value = attrs.get(field)
            if value is not None and value < 0:
                raise serializers.ValidationError({
                    field: f'{field.replace("_", " ").title()} cannot be negative.'
                })
        
        # Validate response_time_hours is non-negative
        response_time = attrs.get('response_time_hours')
        if response_time is not None and response_time < 0:
            raise serializers.ValidationError({
                'response_time_hours': 'Response time cannot be negative.'
            })
        
        return attrs

    def create(self, validated_data):
        """
        Create ASE Lead — company and created_by are set by perform_create in the ViewSet.
        This method is a passthrough; the ViewSet's perform_create handles all assignment.
        """
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Update ASE Lead
        """
        return super().update(instance, validated_data)


class ASELeadListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ASE Leads with new marketing team fields
    """
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    service_interests_display = serializers.ReadOnlyField()
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    
    # Make email optional
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    
    # Role assignment names
    researched_by_name = serializers.SerializerMethodField()
    contacted_by_name = serializers.SerializerMethodField()
    managed_by_name = serializers.SerializerMethodField()

    # ── Computed / read-only properties ──────────────────────────────────────
    contact_display = serializers.SerializerMethodField()
    days_since_created = serializers.SerializerMethodField()
    days_in_current_status = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    engagement_score = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()

    def get_contact_display(self, obj):
        """Return a combined display string for the primary contact."""
        parts = []
        if obj.contact_person:
            parts.append(obj.contact_person)
        if obj.company_name:
            parts.append(f"({obj.company_name})")
        return " ".join(parts) if parts else None

    def get_days_since_created(self, obj):
        """Return the number of days since this lead was created."""
        if obj.created_at is None:
            return None
        delta = timezone.now() - obj.created_at
        return delta.days

    def get_days_in_current_status(self, obj):
        """Return the number of days the lead has been in its current status."""
        status = obj.status
        reference_dt = None

        if status == 'new':
            reference_dt = obj.created_at
        elif status == 'qualified':
            reference_dt = obj.research_completed_at or obj.created_at
        elif status == 'contacted':
            reference_dt = obj.first_contact_at or obj.updated_at
        elif status == 'nurturing':
            reference_dt = obj.last_engagement_date or obj.updated_at
        elif status == 'proposal_sent':
            reference_dt = obj.proposal_sent_at or obj.updated_at
        elif status == 'negotiating':
            reference_dt = obj.proposal_sent_at or obj.updated_at
        elif status in ('won', 'lost'):
            reference_dt = obj.deal_closed_at or obj.updated_at
        else:
            reference_dt = obj.updated_at

        if reference_dt is None:
            return None
        delta = timezone.now() - reference_dt
        return max(delta.days, 0)

    def get_is_overdue(self, obj):
        """Return True when the lead has been in its current status too long."""
        thresholds = {
            'new': 7,
            'qualified': 7,
            'contacted': 14,
            'nurturing': 14,
            'proposal_sent': 21,
            'negotiating': 30,
        }
        threshold = thresholds.get(obj.status)
        if threshold is None:
            return False
        days = self.get_days_in_current_status(obj)
        if days is None:
            return False
        return days > threshold

    def get_engagement_score(self, obj):
        """Compute a composite engagement score (0-100)."""
        lead_score_component = obj.lead_score or 0

        engagement_map = {'cold': 0, 'warm': 33, 'hot': 67, 'very_hot': 100}
        engagement_level_component = engagement_map.get(obj.engagement_level or 'cold', 0)

        recency_component = 0
        if obj.last_engagement_date:
            days_since = (timezone.now() - obj.last_engagement_date).days
            if days_since <= 0:
                recency_component = 100
            elif days_since <= 7:
                recency_component = 75
            elif days_since <= 14:
                recency_component = 50
            elif days_since <= 30:
                recency_component = 25

        total_activities = (
            (obj.total_calls_made or 0)
            + (obj.total_emails_sent or 0)
            + (obj.total_meetings_held or 0)
        )
        volume_component = min(total_activities / 20.0 * 100, 100)

        score = (
            lead_score_component * 0.40
            + engagement_level_component * 0.20
            + recency_component * 0.20
            + volume_component * 0.20
        )
        return round(score, 1)

    def get_status_display(self, obj):
        """Return the human-readable label for the current status."""
        return obj.get_status_display()
    
    def get_researched_by_name(self, obj):
        """Get the BRE's full name"""
        if obj.researched_by:
            return f"{obj.researched_by.first_name} {obj.researched_by.last_name}".strip() or obj.researched_by.username
        return None
    
    def get_contacted_by_name(self, obj):
        """Get the BOE's full name"""
        if obj.contacted_by:
            return f"{obj.contacted_by.first_name} {obj.contacted_by.last_name}".strip() or obj.contacted_by.username
        return None
    
    def get_managed_by_name(self, obj):
        """Get the CRE's full name"""
        if obj.managed_by:
            return f"{obj.managed_by.first_name} {obj.managed_by.last_name}".strip() or obj.managed_by.username
        return None
    
    class Meta:
        model = ASELead
        fields = [
            'id',
            'company_name',
            'contact_person',
            'email',
            'phone',
            'website',
            'industry',
            'company_size',
            'annual_revenue',
            'service_interests',
            'service_interests_display',
            'custom_services',
            'current_marketing_spend',
            'budget_amount',
            'has_website',
            'has_social_media',
            'current_seo_agency',
            'marketing_goals',
            'lead_source',
            'referral_source',
            'status',
            'priority',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'company_name_display',
            
            # Role Assignment Fields
            'researched_by',
            'researched_by_name',
            'contacted_by',
            'contacted_by_name',
            'managed_by',
            'managed_by_name',
            
            # Tracking Timestamps
            'research_completed_at',
            'first_contact_at',
            'proposal_sent_at',
            'deal_closed_at',
            
            # Performance Metrics
            'total_calls_made',
            'total_emails_sent',
            'total_meetings_held',
            'response_time_hours',
            
            # Qualification Fields
            'lead_score',
            'qualification_notes',
            'disqualification_reason',
            
            # Engagement Fields
            'engagement_level',
            'last_engagement_type',
            'last_engagement_date',
            
            'notes',
            'first_contact_date',
            'last_contact_date',
            'next_follow_up',
            'proposal_sent_date',
            'contract_start_date',
            'estimated_project_value',
            'monthly_retainer',
            'created_at',

            # ── Computed / read-only properties ──────────────────────────────
            'contact_display',
            'days_since_created',
            'days_in_current_status',
            'is_overdue',
            'engagement_score',
            'status_display',
        ]


class ASELeadActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for ASE Lead Activity model.
    Handles all activity types: calls, emails, meetings, notes, status changes, assignments.

    Nested relationships included (all read-only):
    - user_details → UserBasicSerializer: who performed the activity
    - lead_details  → ASELeadNestedSerializer: compact lead context
    """
    # Read-only fields for display
    user_name = serializers.ReadOnlyField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    is_overdue_followup = serializers.ReadOnlyField()
    
    # Nested serializers for relationships
    user_details = UserBasicSerializer(source='user', read_only=True)
    lead_details = ASELeadNestedSerializer(source='lead', read_only=True)

    # Kept for backward-compat / lightweight access without full lead_details
    lead_company_name = serializers.CharField(source='lead.company_name', read_only=True)
    lead_contact_person = serializers.CharField(source='lead.contact_person', read_only=True)

    # ── Computed / read-only properties ──────────────────────────────────────

    # Human-readable call duration (e.g. "5 min 30 sec")
    call_duration_display = serializers.SerializerMethodField()

    # How many days ago this activity occurred
    days_since_activity = serializers.SerializerMethodField()

    def get_call_duration_display(self, obj):
        """Return a human-readable call duration string."""
        if obj.call_duration_minutes is None:
            return None
        minutes = int(obj.call_duration_minutes)
        if minutes < 60:
            return f"{minutes} min"
        hours = minutes // 60
        remaining = minutes % 60
        if remaining:
            return f"{hours} hr {remaining} min"
        return f"{hours} hr"

    def get_days_since_activity(self, obj):
        """Return the number of days since this activity was created."""
        if obj.created_at is None:
            return None
        delta = timezone.now() - obj.created_at
        return delta.days
    
    class Meta:
        model = ASELeadActivity
        fields = [
            'id',
            
            # Relationships
            'lead',
            'lead_details',
            'lead_company_name',
            'lead_contact_person',
            'user',
            'user_name',
            'user_details',
            
            # Activity Details
            'activity_type',
            'activity_type_display',
            'title',
            'description',
            'outcome',
            
            # Call-specific fields
            'call_duration_minutes',
            'call_outcome',
            
            # Email-specific fields
            'email_subject',
            'email_opened',
            'email_clicked',
            
            # Meeting-specific fields
            'meeting_date',
            'meeting_attendees',
            
            # Follow-up tracking
            'requires_followup',
            'followup_date',
            'followup_completed',
            'is_overdue_followup',
            
            # Timestamps
            'created_at',
            'updated_at',

            # ── Computed / read-only properties ──────────────────────────────
            'call_duration_display',
            'days_since_activity',
        ]
        read_only_fields = [
            'user',
            'user_name',
            'user_details',
            'lead_details',
            'activity_type_display',
            'is_overdue_followup',
            'lead_company_name',
            'lead_contact_person',
            'created_at',
            'updated_at',
            # Computed properties
            'call_duration_display',
            'days_since_activity',
        ]
    
    def validate_activity_type(self, value):
        """
        Validate activity_type is one of the allowed choices
        """
        valid_choices = ['call', 'email', 'meeting', 'note', 'status_change', 'assignment']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Activity type must be one of: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_call_duration_minutes(self, value):
        """
        Validate call duration is non-negative
        """
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Call duration cannot be negative."
            )
        return value
    
    def validate_meeting_attendees(self, value):
        """
        Validate meeting_attendees is a list
        """
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError(
                "Meeting attendees must be a list."
            )
        return value
    
    def validate(self, attrs):
        """
        Object-level validation
        """
        activity_type = attrs.get('activity_type', self.instance.activity_type if self.instance else None)
        
        # Validate call-specific fields
        if activity_type == 'call':
            if not attrs.get('call_duration_minutes') and not self.instance:
                raise serializers.ValidationError({
                    'call_duration_minutes': 'Call duration is required for call activities.'
                })
        
        # Validate email-specific fields
        if activity_type == 'email':
            if not attrs.get('email_subject') and not self.instance:
                raise serializers.ValidationError({
                    'email_subject': 'Email subject is required for email activities.'
                })
        
        # Validate meeting-specific fields
        if activity_type == 'meeting':
            if not attrs.get('meeting_date') and not self.instance:
                raise serializers.ValidationError({
                    'meeting_date': 'Meeting date is required for meeting activities.'
                })
        
        # Validate follow-up fields
        if attrs.get('requires_followup'):
            if not attrs.get('followup_date'):
                raise serializers.ValidationError({
                    'followup_date': 'Follow-up date is required when follow-up is required.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """
        Create activity - user is set by perform_create in the ViewSet
        """
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Update activity
        """
        return super().update(instance, validated_data)


class ASELeadActivityListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ASE Lead Activities
    """
    user_name = serializers.ReadOnlyField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    lead_company_name = serializers.CharField(source='lead.company_name', read_only=True)
    is_overdue_followup = serializers.ReadOnlyField()

    # Computed read-only properties
    days_since_activity = serializers.SerializerMethodField()

    def get_days_since_activity(self, obj):
        """Return the number of days since this activity was created."""
        if obj.created_at is None:
            return None
        delta = timezone.now() - obj.created_at
        return delta.days

    class Meta:
        model = ASELeadActivity
        fields = [
            'id',
            'lead',
            'lead_company_name',
            'user_name',
            'activity_type',
            'activity_type_display',
            'title',
            'outcome',
            'requires_followup',
            'followup_date',
            'followup_completed',
            'is_overdue_followup',
            'created_at',
            # Computed
            'days_since_activity',
        ]


class ASELeadTaskSerializer(serializers.ModelSerializer):
    """
    Serializer for ASE Lead Task model.
    Handles all task types: calls, emails, meetings, research, proposals, follow-ups.

    Nested relationships included (all read-only):
    - assigned_to_details  → UserBasicSerializer: who the task is assigned to
    - created_by_details   → UserBasicSerializer: who created the task
    - lead_details         → ASELeadNestedSerializer: compact lead context
    """
    # Read-only fields for display
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    is_due_soon = serializers.ReadOnlyField()
    priority_order = serializers.ReadOnlyField()
    
    # Nested serializers for relationships
    assigned_to_details = UserBasicSerializer(source='assigned_to', read_only=True)
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    lead_details = ASELeadNestedSerializer(source='lead', read_only=True, allow_null=True)

    # Kept for backward-compat / lightweight access without full lead_details
    lead_company_name = serializers.CharField(source='lead.company_name', read_only=True, default=None)
    lead_contact_person = serializers.CharField(source='lead.contact_person', read_only=True, default=None)
    lead_status = serializers.CharField(source='lead.status', read_only=True, default=None)

    # ── Computed / read-only properties ──────────────────────────────────────

    # Positive = days remaining; negative = days overdue; None = completed/cancelled
    days_until_due = serializers.SerializerMethodField()

    def get_days_until_due(self, obj):
        """
        Return the number of days until (or since) the task is due.
        Positive means days remaining; negative means overdue by that many days.
        Returns None for completed or cancelled tasks.
        """
        if obj.status in ('completed', 'cancelled'):
            return None
        delta = obj.due_date - timezone.now()
        return delta.days
    
    class Meta:
        model = ASELeadTask
        fields = [
            'id',
            
            # Relationships
            'lead',
            'lead_details',
            'lead_company_name',
            'lead_contact_person',
            'lead_status',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_details',
            'created_by',
            'created_by_name',
            'created_by_details',
            
            # Task Details
            'task_type',
            'task_type_display',
            'title',
            'description',
            
            # Priority and Status
            'priority',
            'priority_display',
            'priority_order',
            'status',
            'status_display',
            
            # Scheduling
            'due_date',
            'completed_at',
            'is_overdue',
            'is_due_soon',
            
            # Reminder
            'reminder_sent',
            'reminder_date',
            
            # Timestamps
            'created_at',
            'updated_at',

            # ── Computed / read-only properties ──────────────────────────────
            'days_until_due',
        ]
        read_only_fields = [
            'created_by',
            'assigned_to_name',
            'assigned_to_details',
            'created_by_name',
            'created_by_details',
            'lead_details',
            'task_type_display',
            'priority_display',
            'status_display',
            'is_overdue',
            'is_due_soon',
            'priority_order',
            'lead_company_name',
            'lead_contact_person',
            'lead_status',
            'created_at',
            'updated_at',
            # Computed properties
            'days_until_due',
        ]
    
    def validate_task_type(self, value):
        """
        Validate task_type is one of the allowed choices
        """
        valid_choices = ['call', 'email', 'meeting', 'research', 'proposal', 'followup', 'other']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Task type must be one of: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_priority(self, value):
        """
        Validate priority is one of the allowed choices
        """
        valid_choices = ['low', 'medium', 'high', 'urgent']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Priority must be one of: {', '.join(valid_choices)}"
            )
        return value
    
    def validate_status(self, value):
        """
        Validate status is one of the allowed choices
        """
        valid_choices = ['pending', 'in_progress', 'completed', 'cancelled']
        if value not in valid_choices:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(valid_choices)}"
            )
        return value
    
    def validate(self, attrs):
        """
        Object-level validation
        """
        # Validate that completed_at is set when status is completed
        status = attrs.get('status', self.instance.status if self.instance else None)
        completed_at = attrs.get('completed_at', self.instance.completed_at if self.instance else None)
        
        if status == 'completed' and not completed_at:
            attrs['completed_at'] = timezone.now()
        
        # Validate that reminder_date is set when reminder_sent is True
        reminder_sent = attrs.get('reminder_sent', self.instance.reminder_sent if self.instance else False)
        reminder_date = attrs.get('reminder_date', self.instance.reminder_date if self.instance else None)
        
        if reminder_sent and not reminder_date:
            raise serializers.ValidationError({
                'reminder_date': 'Reminder date must be set when reminder is sent.'
            })
        
        # Validate that due_date is in the future for new tasks
        due_date = attrs.get('due_date')
        if due_date and not self.instance:
            if due_date < timezone.now():
                raise serializers.ValidationError({
                    'due_date': 'Due date must be in the future for new tasks.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """
        Create task - created_by is set by perform_create in the ViewSet
        """
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Update task
        """
        return super().update(instance, validated_data)


class ASELeadTaskListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ASE Lead Tasks
    """
    assigned_to_name = serializers.ReadOnlyField()
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    lead_company_name = serializers.CharField(source='lead.company_name', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    is_due_soon = serializers.ReadOnlyField()

    # Computed read-only properties
    days_until_due = serializers.SerializerMethodField()

    def get_days_until_due(self, obj):
        """
        Return the number of days until (or since) the task is due.
        Positive = days remaining; negative = days overdue.
        Returns None for completed or cancelled tasks.
        """
        if obj.status in ('completed', 'cancelled'):
            return None
        delta = obj.due_date - timezone.now()
        return delta.days

    class Meta:
        model = ASELeadTask
        fields = [
            'id',
            'lead',
            'lead_company_name',
            'assigned_to',
            'assigned_to_name',
            'task_type',
            'task_type_display',
            'title',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'due_date',
            'is_overdue',
            'is_due_soon',
            'created_at',
            # Computed
            'days_until_due',
        ]