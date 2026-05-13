from rest_framework import serializers
from .models import Team
from accounts.serializers import UserSerializer


class TeamSerializer(serializers.ModelSerializer):
    team_lead_detail = UserSerializer(source='team_lead', read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    team_lead_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Team
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'member_count']
    
    def validate(self, data):
        """
        Validate that marketing categories are only used for ASE Technologies.
        """
        marketing_category = data.get('marketing_category')
        company = data.get('company')
        team_type = data.get('team_type')
        
        # If updating, get existing values
        if self.instance:
            company = company or self.instance.company
            team_type = team_type or self.instance.team_type
        
        # Check if marketing_category is being set
        if marketing_category:
            # Ensure it's only for ASE Technologies (company code 'ASE')
            if company and company.code != 'ASE':
                raise serializers.ValidationError({
                    'marketing_category': 'Marketing team categories are only available for ASE Technologies. '
                                        'Other companies cannot use marketing categories.'
                })
            
            # Ensure team_type is 'marketing' when marketing_category is set
            if team_type != 'marketing':
                raise serializers.ValidationError({
                    'marketing_category': 'Marketing category can only be set for teams with team_type="marketing".'
                })
        
        return data
    
    def to_representation(self, instance):
        """Add member count to response"""
        data = super().to_representation(instance)
        data['member_count'] = instance.member_count
        data['team_lead_name'] = instance.team_lead_name
        return data


class TeamListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for team lists"""
    member_count = serializers.IntegerField(read_only=True)
    team_lead_name = serializers.CharField(read_only=True)
    marketing_category_display = serializers.CharField(source='get_marketing_category_display', read_only=True)
    
    class Meta:
        model = Team
        fields = ['id', 'name', 'team_type', 'marketing_category', 'marketing_category_display', 'team_lead', 'team_lead_name', 'member_count', 'is_active']
        read_only_fields = ['member_count', 'team_lead_name', 'marketing_category_display']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['member_count'] = instance.member_count
        data['team_lead_name'] = instance.team_lead_name
        return data
