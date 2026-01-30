from rest_framework import serializers
from .models import AppSettings

class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = [
            'id', 'app_name', 'logo_url', 'favicon_url', 
            'primary_color', 'accent_color', 'sidebar_color', 
            'custom_css', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_logo_url(self, value):
        """Allow any string for logo URL (including blob URLs and data URLs)"""
        # No validation needed - allow any string including blob: and data: URLs
        return value
    
    def validate_favicon_url(self, value):
        """Allow any string for favicon URL (including blob URLs and data URLs)"""
        # No validation needed - allow any string including blob: and data: URLs
        return value
    
    def validate_primary_color(self, value):
        """Validate HSL color format"""
        if value and not self._is_valid_hsl(value):
            raise serializers.ValidationError("Primary color must be in HSL format (e.g., '152 45% 28%')")
        return value
    
    def validate_accent_color(self, value):
        """Validate HSL color format"""
        if value and not self._is_valid_hsl(value):
            raise serializers.ValidationError("Accent color must be in HSL format (e.g., '45 90% 50%')")
        return value
    
    def validate_sidebar_color(self, value):
        """Validate HSL color format"""
        if value and not self._is_valid_hsl(value):
            raise serializers.ValidationError("Sidebar color must be in HSL format (e.g., '152 35% 15%')")
        return value
    
    def _is_valid_hsl(self, value):
        """Basic HSL format validation"""
        if not value:
            return True
        
        try:
            parts = value.strip().split()
            if len(parts) != 3:
                return False
            
            # Check hue (0-360)
            hue = int(parts[0])
            if not (0 <= hue <= 360):
                return False
            
            # Check saturation (0-100%)
            saturation = parts[1]
            if not saturation.endswith('%'):
                return False
            sat_val = int(saturation[:-1])
            if not (0 <= sat_val <= 100):
                return False
            
            # Check lightness (0-100%)
            lightness = parts[2]
            if not lightness.endswith('%'):
                return False
            light_val = int(lightness[:-1])
            if not (0 <= light_val <= 100):
                return False
            
            return True
        except (ValueError, IndexError):
            return False