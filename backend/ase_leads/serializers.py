from rest_framework import serializers
from .models import ASELead


class ASELeadSerializer(serializers.ModelSerializer):
    """
    Serializer for ASE Lead model
    """
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    service_interests_display = serializers.ReadOnlyField()
    
    # Company information
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)
    
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
            
            # Important Dates
            'first_contact_date',
            'last_contact_date',
            'next_follow_up',
            'proposal_sent_date',
            'contract_start_date',
            
            # Financial Information
            'estimated_project_value',
            'monthly_retainer',
            
            # Notes and Communication
            'notes',
            'communication_log',
            
            # Metadata
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
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
    Lightweight serializer for listing ASE Leads
    """
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    service_interests_display = serializers.ReadOnlyField()
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    
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
            'notes',
            'first_contact_date',
            'last_contact_date',
            'next_follow_up',
            'proposal_sent_date',
            'contract_start_date',
            'estimated_project_value',
            'monthly_retainer',
            'created_at',
        ]