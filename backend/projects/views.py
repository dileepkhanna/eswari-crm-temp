from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
import os
import uuid
import mimetypes
from .models import Project
from .serializers import ProjectSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'manager']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_cover_image(self, request):
        """Upload cover/project image and return the URL"""
        try:
            if 'image' not in request.FILES:
                return Response(
                    {'error': 'No image file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            image_file = request.FILES['image']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if image_file.content_type not in allowed_types:
                return Response(
                    {'error': 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file size (max 10MB)
            if image_file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File too large. Maximum size is 10MB.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate unique filename
            file_extension = os.path.splitext(image_file.name)[1]
            unique_filename = f"cover_project_{uuid.uuid4().hex}{file_extension}"
            
            # Create projects directory if it doesn't exist
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'projects')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save file
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
            
            # Return the URL - construct full URL with proper scheme and host
            scheme = 'https' if request.is_secure() else 'http'
            host = request.get_host()
            image_url = f"{scheme}://{host}{settings.MEDIA_URL}projects/{unique_filename}"
            
            return Response({
                'url': image_url,
                'filename': unique_filename,
                'type': 'cover'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_blueprint_image(self, request):
        """Upload blueprint image and return the URL"""
        try:
            if 'image' not in request.FILES:
                return Response(
                    {'error': 'No image file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            image_file = request.FILES['image']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if image_file.content_type not in allowed_types:
                return Response(
                    {'error': 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file size (max 10MB)
            if image_file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File too large. Maximum size is 10MB.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate unique filename
            file_extension = os.path.splitext(image_file.name)[1]
            unique_filename = f"blueprint_project_{uuid.uuid4().hex}{file_extension}"
            
            # Create projects directory if it doesn't exist
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'projects')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Save file
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)
            
            # Return the URL - construct full URL with proper scheme and host
            scheme = 'https' if request.is_secure() else 'http'
            host = request.get_host()
            image_url = f"{scheme}://{host}{settings.MEDIA_URL}projects/{unique_filename}"
            
            return Response({
                'url': image_url,
                'filename': unique_filename,
                'type': 'blueprint'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Upload failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def download_cover_image(self, request, pk=None):
        """Download cover image - Admin only"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only administrators can download project images'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        project = get_object_or_404(Project, pk=pk)
        if not project.cover_image:
            return Response(
                {'error': 'No cover image available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract filename from URL
        image_url = project.cover_image
        filename = os.path.basename(image_url.split('?')[0])  # Remove query params
        file_path = os.path.join(settings.MEDIA_ROOT, 'projects', filename)
        
        if not os.path.exists(file_path):
            return Response(
                {'error': 'Image file not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Read and return file
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{project.name}_cover.jpg"'
            return response

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def download_blueprint_image(self, request, pk=None):
        """Download blueprint image - Admin only"""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only administrators can download project images'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        project = get_object_or_404(Project, pk=pk)
        if not project.blueprint_image:
            return Response(
                {'error': 'No blueprint image available'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract filename from URL
        image_url = project.blueprint_image
        filename = os.path.basename(image_url.split('?')[0])  # Remove query params
        file_path = os.path.join(settings.MEDIA_ROOT, 'projects', filename)
        
        if not os.path.exists(file_path):
            return Response(
                {'error': 'Image file not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Read and return file
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{project.name}_blueprint.jpg"'
            return response