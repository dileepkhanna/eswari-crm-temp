from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Birthday, BirthdayAnnouncement

User = get_user_model()

class BirthdaySerializer(serializers.ModelSerializer):
    """Serializer for Birthday model"""
    
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    employee_company = serializers.CharField(source='employee.company.name', read_only=True)
    age = serializers.IntegerField(read_only=True)
    next_birthday = serializers.DateField(read_only=True)
    is_birthday_today = serializers.BooleanField(read_only=True)
    days_until_birthday = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Birthday
        fields = [
            'id', 'employee', 'employee_name', 'employee_email', 'employee_role', 
            'employee_company', 'birth_date', 'show_age', 'announce_birthday',
            'age', 'next_birthday', 'is_birthday_today', 'days_until_birthday',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_employee(self, value):
        """Ensure employee doesn't already have a birthday record"""
        if self.instance is None:  # Creating new record
            if Birthday.objects.filter(employee=value).exists():
                raise serializers.ValidationError(
                    f"Birthday record already exists for {value.get_full_name()}"
                )
        return value


class EmployeeSelectSerializer(serializers.ModelSerializer):
    """Serializer for employee selection in birthday forms"""
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'role', 'company_name']


class BirthdayAnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for BirthdayAnnouncement model"""
    
    employee_name = serializers.CharField(source='birthday.employee.get_full_name', read_only=True)
    
    class Meta:
        model = BirthdayAnnouncement
        fields = ['id', 'birthday', 'employee_name', 'announcement_date', 'announcement_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class TodayBirthdaySerializer(serializers.ModelSerializer):
    """Serializer for today's birthdays"""
    
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    employee_company = serializers.CharField(source='employee.company.name', read_only=True)
    age = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Birthday
        fields = [
            'id', 'employee', 'employee_name', 'employee_email', 
            'employee_role', 'employee_company', 'birth_date', 
            'show_age', 'age'
        ]