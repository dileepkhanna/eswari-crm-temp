from rest_framework import serializers
from .models import AppSettings
import re


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
        return value
    
    def validate_favicon_url(self, value):
        """Allow any string for favicon URL (including blob URLs and data URLs)"""
        return value
    
    def validate_primary_color(self, value):
        """Validate color format (HSL, HEX, or RGB)"""
        if value and not self._is_valid_color(value):
            raise serializers.ValidationError("Primary color must be in HSL (e.g., '215 80% 35%'), HEX (e.g., '#2563eb'), or RGB (e.g., 'rgb(37, 99, 235)') format")
        return value
    
    def validate_accent_color(self, value):
        """Validate color format (HSL, HEX, or RGB)"""
        if value and not self._is_valid_color(value):
            raise serializers.ValidationError("Accent color must be in HSL (e.g., '45 90% 50%'), HEX (e.g., '#eab308'), or RGB (e.g., 'rgb(234, 179, 8)') format")
        return value
    
    def validate_sidebar_color(self, value):
        """Validate color format (HSL, HEX, or RGB)"""
        if value and not self._is_valid_color(value):
            raise serializers.ValidationError("Sidebar color must be in HSL (e.g., '152 35% 15%'), HEX (e.g., '#064e3b'), or RGB (e.g., 'rgb(6, 78, 59)') format")
        return value
    
    def _is_valid_color(self, value):
        """Validate color in HSL, HEX, or RGB format"""
        if not value:
            return True
        value = value.strip()
        # Check HEX format (#RGB, #RRGGBB, #RRGGBBAA)
        if re.match(r'^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$', value):
            return True
        # Check RGB format: rgb(r, g, b) or just "r, g, b" or "r g b"
        if re.match(r'^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$', value, re.IGNORECASE):
            return True
        # Check HSL format: "H S% L%"
        if self._is_valid_hsl(value):
            return True
        return False
    
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