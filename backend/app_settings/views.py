from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import uuid
from .models import AppSettings
from .serializers import AppSettingsSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_app_settings(request):
    """Get current app settings"""
    try:
        settings = AppSettings.get_settings()
        serializer = AppSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to fetch app settings',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_app_settings(request):
    """Update app settings - only admins can update"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can update app settings'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        settings = AppSettings.get_settings()
        serializer = AppSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'App settings updated successfully',
                'settings': serializer.data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'error': 'Failed to update app settings',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_logo(request):
    """Upload logo image - only admins can upload"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can upload logo'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if 'logo' not in request.FILES:
        return Response({
            'error': 'No logo file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    logo_file = request.FILES['logo']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if logo_file.content_type not in allowed_types:
        return Response({
            'error': 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 2MB)
    if logo_file.size > 2 * 1024 * 1024:
        return Response({
            'error': 'File too large. Please upload an image under 2MB.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(logo_file.name)[1]
        filename = f"logo_{uuid.uuid4().hex}{file_extension}"
        file_path = f"branding/{filename}"
        
        # Save file
        saved_path = default_storage.save(file_path, ContentFile(logo_file.read()))
        
        # Use relative URL for media files (works better with Django's media serving)
        if hasattr(settings, 'MEDIA_URL') and settings.MEDIA_URL:
            logo_url = f"{settings.MEDIA_URL}{saved_path}"
        else:
            logo_url = f"/media/{saved_path}"
        
        print(f"DEBUG: Generated logo URL: {logo_url}")  # Debug logging
        
        # Update app settings
        app_settings = AppSettings.get_settings()
        
        # Delete old logo file if exists
        if app_settings.logo_url and '/media/' in app_settings.logo_url:
            old_path = app_settings.logo_url.replace('/media/', '')
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
        
        app_settings.logo_url = logo_url
        app_settings.save()
        
        return Response({
            'message': 'Logo uploaded successfully',
            'logo_url': logo_url,
            'filename': filename
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to upload logo',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_favicon(request):
    """Upload favicon image - only admins can upload"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can upload favicon'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if 'favicon' not in request.FILES:
        return Response({
            'error': 'No favicon file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    favicon_file = request.FILES['favicon']
    
    # Validate file type
    allowed_types = ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml']
    if favicon_file.content_type not in allowed_types:
        return Response({
            'error': 'Invalid file type. Please upload a PNG, ICO, or SVG image for favicon.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 512KB)
    if favicon_file.size > 512 * 1024:
        return Response({
            'error': 'File too large. Please upload a favicon under 512KB.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(favicon_file.name)[1]
        if not file_extension:
            file_extension = '.png'  # Default to PNG if no extension
        filename = f"favicon_{uuid.uuid4().hex}{file_extension}"
        file_path = f"branding/{filename}"
        
        # Save file
        saved_path = default_storage.save(file_path, ContentFile(favicon_file.read()))
        
        # Use relative URL for media files (works better with Django's media serving)
        if hasattr(settings, 'MEDIA_URL') and settings.MEDIA_URL:
            favicon_url = f"{settings.MEDIA_URL}{saved_path}"
        else:
            favicon_url = f"/media/{saved_path}"
        
        print(f"DEBUG: Generated favicon URL: {favicon_url}")  # Debug logging
        
        # Update app settings
        app_settings = AppSettings.get_settings()
        
        # Delete old favicon file if exists
        if app_settings.favicon_url and '/media/' in app_settings.favicon_url:
            old_path = app_settings.favicon_url.replace('/media/', '')
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
        
        app_settings.favicon_url = favicon_url
        app_settings.save()
        
        return Response({
            'message': 'Favicon uploaded successfully',
            'favicon_url': favicon_url,
            'filename': filename
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to upload favicon',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_app_settings(request):
    """Reset app settings to defaults - only admins can reset"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can reset app settings'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        # Get current settings to delete old files
        current_settings = AppSettings.get_settings()
        
        # Delete old logo file if exists
        if current_settings.logo_url and '/media/' in current_settings.logo_url:
            old_path = current_settings.logo_url.replace('/media/', '')
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
        
        # Delete old favicon file if exists
        if current_settings.favicon_url and '/media/' in current_settings.favicon_url:
            old_path = current_settings.favicon_url.replace('/media/', '')
            if default_storage.exists(old_path):
                default_storage.delete(old_path)
        
        # Delete existing settings and create new default ones
        AppSettings.objects.all().delete()
        settings = AppSettings.get_settings()
        serializer = AppSettingsSerializer(settings)
        
        return Response({
            'message': 'App settings reset to defaults successfully',
            'settings': serializer.data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'error': 'Failed to reset app settings',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)