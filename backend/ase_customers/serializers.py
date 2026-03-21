from rest_framework import serializers
from .models import ASECustomer, CallLog, CustomerNote


class ASECustomerSerializer(serializers.ModelSerializer):
    """
    Serializer for ASE Customer model (simple version)
    """
    assigned_to_name = serializers.ReadOnlyField()
    created_by_name = serializers.ReadOnlyField()
    
    # Company information
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    company_code = serializers.CharField(source='company.code', read_only=True)
    
    class Meta:
        model = ASECustomer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'company_name',
            'call_status',
            'custom_call_status',
            'company',
            'company_name_display',
            'company_code',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'scheduled_date',
            'call_date',
            'service_interests',
            'custom_services',
            'notes',
            'is_converted',
            'converted_lead_id',
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
            qs = ASECustomer.objects.filter(phone=value, company=company)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"A customer with phone number '{value}' already exists in your company."
                )
        return value

    def create(self, validated_data):
        """
        Create ASE Customer with automatic company and created_by assignment
        """
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
            
            # Auto-assign company if not provided
            if 'company' not in validated_data and hasattr(request.user, 'company'):
                validated_data['company'] = request.user.company
        
        return super().create(validated_data)


class ASECustomerListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ASE Customers
    """
    assigned_to_name = serializers.ReadOnlyField()
    company_name_display = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = ASECustomer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'company_name',
            'call_status',
            'custom_call_status',
            'assigned_to_name',
            'company_name_display',
            'service_interests',
            'custom_services',
            'created_at',
            'scheduled_date',
            'is_converted',
        ]


class CallLogSerializer(serializers.ModelSerializer):
    called_by_name = serializers.SerializerMethodField()
    call_status_display = serializers.SerializerMethodField()

    class Meta:
        model = CallLog
        fields = [
            'id',
            'customer',
            'called_by',
            'called_by_name',
            'call_status',
            'call_status_display',
            'custom_status',
            'notes',
            'called_at',
        ]
        read_only_fields = ['called_by', 'called_at']

    def get_called_by_name(self, obj):
        if obj.called_by:
            return f"{obj.called_by.first_name} {obj.called_by.last_name}".strip() or obj.called_by.username
        return 'Unknown'

    def get_call_status_display(self, obj):
        if obj.call_status == 'custom' and obj.custom_status:
            return obj.custom_status
        return dict(ASECustomer.CALL_STATUS_CHOICES).get(obj.call_status, obj.call_status)


class CustomerNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerNote
        fields = ['id', 'customer', 'author', 'author_name', 'content', 'created_at']
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.username
        return 'Unknown'
