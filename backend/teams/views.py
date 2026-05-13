from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Team
from .serializers import TeamSerializer, TeamListSerializer
from accounts.permissions import CompanyAccessPermission
from utils.mixins import CompanyFilterMixin


class TeamViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Team.objects.all()
    permission_classes = [CompanyAccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['team_type', 'is_active', 'team_lead', 'marketing_category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'team_type', 'created_at']
    ordering = ['team_type', 'name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TeamListSerializer
        return TeamSerializer
    
    def get_queryset(self):
        """Filter teams based on user's company - Teams are only for ASE Technologies"""
        user = self.request.user
        base_queryset = Team.objects.select_related('team_lead', 'company')
        
        # Teams are only available for ASE Technologies (company_id=2)
        # Filter to only show ASE Technologies teams
        base_queryset = base_queryset.filter(company_id=2)
        
        # Allow unauthenticated access for now (will be filtered by company)
        if not user.is_authenticated:
            return base_queryset
        
        if user.role == 'admin':
            return base_queryset
        else:
            # All users can see teams in their company (if it's ASE Technologies)
            return base_queryset
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a team"""
        team = self.get_object()
        members = team.members.select_related('company', 'team', 'manager').all()
        
        from accounts.serializers import UserSerializer
        serializer = UserSerializer(members, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get team statistics"""
        team = self.get_object()
        members = team.members.all()
        
        stats = {
            'total_members': members.count(),
            'team_leads': members.filter(role='team_lead').count(),
            'managers': members.filter(role='manager').count(),
            'employees': members.filter(role='employee').count(),
            'team_info': {
                'id': team.id,
                'name': team.name,
                'team_type': team.team_type,
                'description': team.description,
                'is_active': team.is_active,
                'team_lead_name': team.team_lead_name,
            }
        }
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Get available team types"""
        types = [
            {'value': choice[0], 'label': choice[1]}
            for choice in Team.TEAM_TYPE_CHOICES
        ]
        return Response(types)
    
    @action(detail=False, methods=['get'])
    def marketing_categories(self, request):
        """Get available marketing categories with team info"""
        # Get all marketing teams grouped by category
        marketing_teams = Team.objects.filter(
            company_id=2,  # ASE Technologies
            team_type='marketing',
            marketing_category__isnull=False
        ).select_related('team_lead', 'company')
        
        # Group by category and get first team for each
        categories = {}
        for team in marketing_teams:
            if team.marketing_category and team.marketing_category not in categories:
                categories[team.marketing_category] = {
                    'category': team.marketing_category,
                    'category_display': team.get_marketing_category_display(),
                    'team_id': team.id,
                    'team_name': team.name,
                    'description': team.description,
                    'member_count': team.member_count,
                }
        
        # Return in order: BRE, BOE, CRE, Marketing Lead
        ordered_categories = []
        for cat_code in ['bre', 'boe', 'cre', 'marketing_lead']:
            if cat_code in categories:
                ordered_categories.append(categories[cat_code])
        
        return Response(ordered_categories)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get teams grouped by marketing category"""
        marketing_teams = Team.objects.filter(
            company_id=2,
            team_type='marketing',
            marketing_category__isnull=False
        ).select_related('team_lead', 'company').prefetch_related('members')
        
        # Group by category
        categories = {
            'bre': [],
            'boe': [],
            'cre': [],
            'marketing_lead': [],
        }
        
        for team in marketing_teams:
            if team.marketing_category in categories:
                categories[team.marketing_category].append({
                    'id': team.id,
                    'name': team.name,
                    'description': team.description,
                    'member_count': team.member_count,
                    'team_lead_name': team.team_lead_name,
                    'is_active': team.is_active,
                })
        
        return Response({
            'bre': {
                'category': 'bre',
                'category_display': 'Business Research Executive (BRE)',
                'teams': categories['bre'],
                'total_members': sum(t['member_count'] for t in categories['bre']),
            },
            'boe': {
                'category': 'boe',
                'category_display': 'Business Outreach Executive (BOE)',
                'teams': categories['boe'],
                'total_members': sum(t['member_count'] for t in categories['boe']),
            },
            'cre': {
                'category': 'cre',
                'category_display': 'Client Research Executive (CRE)',
                'teams': categories['cre'],
                'total_members': sum(t['member_count'] for t in categories['cre']),
            },
            'marketing_lead': {
                'category': 'marketing_lead',
                'category_display': 'Marketing Team Lead',
                'teams': categories['marketing_lead'],
                'total_members': sum(t['member_count'] for t in categories['marketing_lead']),
            },
        })
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get overview of all teams grouped by type and marketing category"""
        user = request.user
        
        # Get company filter from query params
        company_id = request.query_params.get('company')
        team_type = request.query_params.get('team_type')
        
        queryset = self.get_queryset()
        
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        if team_type:
            queryset = queryset.filter(team_type=team_type)
        
        teams = queryset.select_related('team_lead', 'company').prefetch_related('members')
        
        # Group teams by type
        technical_teams = []
        marketing_teams_by_category = {
            'bre': [],
            'boe': [],
            'cre': [],
            'marketing_lead': [],
            'no_category': [],
        }
        
        for team in teams:
            team_data = {
                'id': team.id,
                'name': team.name,
                'team_type': team.team_type,
                'marketing_category': team.marketing_category,
                'marketing_category_display': team.get_marketing_category_display() if team.marketing_category else None,
                'description': team.description,
                'member_count': team.member_count,
                'team_lead_name': team.team_lead_name,
                'is_active': team.is_active,
            }
            
            if team.team_type == 'technical':
                technical_teams.append(team_data)
            elif team.team_type == 'marketing':
                if team.marketing_category:
                    marketing_teams_by_category[team.marketing_category].append(team_data)
                else:
                    marketing_teams_by_category['no_category'].append(team_data)
        
        # Flatten marketing teams for backward compatibility
        all_marketing_teams = []
        for category_teams in marketing_teams_by_category.values():
            all_marketing_teams.extend(category_teams)
        
        return Response({
            'technical': technical_teams,
            'marketing': all_marketing_teams,
            'marketing_by_category': {
                'bre': {
                    'category': 'bre',
                    'category_display': 'Business Research Executive (BRE)',
                    'teams': marketing_teams_by_category['bre'],
                    'count': len(marketing_teams_by_category['bre']),
                },
                'boe': {
                    'category': 'boe',
                    'category_display': 'Business Outreach Executive (BOE)',
                    'teams': marketing_teams_by_category['boe'],
                    'count': len(marketing_teams_by_category['boe']),
                },
                'cre': {
                    'category': 'cre',
                    'category_display': 'Client Research Executive (CRE)',
                    'teams': marketing_teams_by_category['cre'],
                    'count': len(marketing_teams_by_category['cre']),
                },
                'marketing_lead': {
                    'category': 'marketing_lead',
                    'category_display': 'Marketing Team Lead',
                    'teams': marketing_teams_by_category['marketing_lead'],
                    'count': len(marketing_teams_by_category['marketing_lead']),
                },
            },
            'total_teams': len(technical_teams) + len(all_marketing_teams),
            'technical_count': len(technical_teams),
            'marketing_count': len(all_marketing_teams),
        })
