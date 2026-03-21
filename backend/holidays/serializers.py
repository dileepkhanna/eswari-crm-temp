from rest_framework import serializers
from .models import Holiday
from accounts.serializers import UserSerializer

class CompanyNestedSerializer(serializers.Serializer):
    """Lightweight nested serializer for company information"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)

class HolidaySerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    date = serializers.DateField(source='start_date', read_only=True)  # Backward compatibility
    company_detail = CompanyNestedSerializer(source='company', read_only=True)
    
    class Meta:
        model = Holiday
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)