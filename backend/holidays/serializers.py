from rest_framework import serializers
from .models import Holiday
from accounts.serializers import UserSerializer

class HolidaySerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    date = serializers.DateField(source='start_date', read_only=True)  # Backward compatibility
    
    class Meta:
        model = Holiday
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)