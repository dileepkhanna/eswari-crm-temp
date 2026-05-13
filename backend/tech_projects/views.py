from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import TechProject, TechTask
from .serializers import (
    TechProjectSerializer, 
    TechProjectListSerializer,
    TechTaskSerializer
)

class TechProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for technical projects"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TechProjectListSerializer
        return TechProjectSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Filter by user's team
        if user.team:
            return TechProject.objects.filter(team=user.team)
        
        # Admin can see all
        if user.role == 'admin':
            return TechProject.objects.all()
        
        return TechProject.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get project statistics for dashboard"""
        queryset = self.get_queryset()
        
        stats = {
            'total_projects': queryset.count(),
            'active_projects': queryset.filter(status='active').count(),
            'completed_projects': queryset.filter(status='completed').count(),
            'by_status': {}
        }
        
        # Count by status
        status_counts = queryset.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats['by_status'][item['status']] = item['count']
        
        return Response(stats)


class TechTaskViewSet(viewsets.ModelViewSet):
    """ViewSet for technical tasks"""
    permission_classes = [IsAuthenticated]
    serializer_class = TechTaskSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = TechTask.objects.all()
        
        # Filter by user's team projects
        if user.team:
            queryset = queryset.filter(
                Q(project__team=user.team) | Q(project__isnull=True)
            )
        elif user.role != 'admin':
            # Non-team members see only their own tasks
            queryset = queryset.filter(assignee=user)
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by status
        task_status = self.request.query_params.get('status')
        if task_status:
            queryset = queryset.filter(status=task_status)
        
        # Filter by assignee
        assignee_id = self.request.query_params.get('assignee')
        if assignee_id:
            queryset = queryset.filter(assignee_id=assignee_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """Get tasks organized by status for Kanban board"""
        queryset = self.get_queryset()
        
        kanban_data = {
            'backlog': [],
            'todo': [],
            'in_progress': [],
            'review': [],
            'done': []
        }
        
        # Group tasks by status
        for status_key in kanban_data.keys():
            tasks = queryset.filter(status=status_key)
            kanban_data[status_key] = TechTaskSerializer(tasks, many=True).data
        
        return Response(kanban_data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get task statistics for dashboard"""
        queryset = self.get_queryset()
        
        stats = {
            'total_tasks': queryset.count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'completed': queryset.filter(status='done').count(),
            'by_status': {},
            'by_type': {},
            'by_priority': {}
        }
        
        # Count by status
        status_counts = queryset.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats['by_status'][item['status']] = item['count']
        
        # Count by type
        type_counts = queryset.values('task_type').annotate(count=Count('id'))
        for item in type_counts:
            stats['by_type'][item['task_type']] = item['count']
        
        # Count by priority
        priority_counts = queryset.values('priority').annotate(count=Count('id'))
        for item in priority_counts:
            stats['by_priority'][item['priority']] = item['count']
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move task to different status"""
        task = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(TechTask.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.status = new_status
        task.save()
        
        return Response(TechTaskSerializer(task).data)
