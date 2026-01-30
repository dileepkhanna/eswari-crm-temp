from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models, transaction
from .models import Lead
from .serializers import LeadSerializer

class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    pagination_class = None  # Disable pagination to show all leads
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to', 'requirement_type']
    search_fields = ['name', 'email', 'address', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Role-based lead filtering:
        - Admin: Can see all leads
        - Manager: Can see all leads (their own + employee leads, but with restricted contact access for employee leads)
        - Employee: Can only see leads specifically assigned to them
        """
        user = self.request.user
        
        if user.role == 'admin':
            # Admin can see all leads
            return Lead.objects.all()
        elif user.role == 'manager':
            # Manager can see all leads (both their own and employee leads)
            return Lead.objects.all()
        elif user.role == 'employee':
            # Employee can only see leads specifically assigned to them
            return Lead.objects.filter(assigned_to=user)
        else:
            # Default: no access
            return Lead.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_destroy(self, instance):
        """
        Handle lead deletion with proper permissions:
        - Admin: Can delete any lead
        - Manager: Can delete any lead
        - Employee: Can only delete leads assigned to them
        """
        user = self.request.user
        
        print(f"DEBUG: User {user.username} (ID: {user.id}, Role: {user.role}) attempting to delete lead {instance.id}")
        print(f"DEBUG: Lead assigned to: {instance.assigned_to}")
        print(f"DEBUG: Lead created by: {instance.created_by}")
        print(f"DEBUG: Lead name: {instance.name}")
        
        # Check if lead exists before deletion
        lead_exists_before = Lead.objects.filter(id=instance.id).exists()
        print(f"DEBUG: Lead exists before deletion: {lead_exists_before}")
        
        if user.role in ['admin', 'manager']:
            # Admin and managers can delete any lead
            print(f"DEBUG: Admin/Manager deletion allowed")
            try:
                with transaction.atomic():
                    instance.delete()
                    print(f"DEBUG: instance.delete() called successfully with transaction")
                
                # Check if lead still exists after deletion
                lead_exists_after = Lead.objects.filter(id=instance.id).exists()
                print(f"DEBUG: Lead exists after deletion: {lead_exists_after}")
                
                if lead_exists_after:
                    print(f"ERROR: Lead still exists in database after deletion!")
                else:
                    print(f"SUCCESS: Lead successfully deleted from database")
                    
            except Exception as e:
                print(f"ERROR: Exception during deletion: {e}")
                raise e
                
        elif user.role == 'employee':
            # Employees can only delete leads assigned to them
            if instance.assigned_to == user:
                print(f"DEBUG: Employee deletion allowed (lead assigned to them)")
                try:
                    with transaction.atomic():
                        instance.delete()
                        print(f"DEBUG: instance.delete() called successfully with transaction")
                    
                    # Check if lead still exists after deletion
                    lead_exists_after = Lead.objects.filter(id=instance.id).exists()
                    print(f"DEBUG: Lead exists after deletion: {lead_exists_after}")
                    
                except Exception as e:
                    print(f"ERROR: Exception during deletion: {e}")
                    raise e
            else:
                print(f"DEBUG: Employee deletion denied (lead not assigned to them)")
                raise PermissionDenied("You can only delete leads assigned to you.")
        else:
            print(f"DEBUG: Deletion denied (invalid role)")
            raise PermissionDenied("You do not have permission to delete leads.")
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Bulk delete multiple leads at once.
        Expects: {"lead_ids": [1, 2, 3, ...]}
        """
        user = request.user
        lead_ids = request.data.get('lead_ids', [])
        
        if not lead_ids:
            return Response(
                {'error': 'No lead IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"DEBUG: User {user.username} (ID: {user.id}, Role: {user.role}) attempting bulk delete of {len(lead_ids)} leads")
        print(f"DEBUG: Lead IDs to delete: {lead_ids}")
        
        # Get leads that exist and user has permission to delete
        leads_to_delete = []
        permission_errors = []
        
        for lead_id in lead_ids:
            try:
                lead = Lead.objects.get(id=lead_id)
                
                # Check permissions
                if user.role in ['admin', 'manager']:
                    leads_to_delete.append(lead)
                elif user.role == 'employee':
                    if lead.assigned_to == user:
                        leads_to_delete.append(lead)
                    else:
                        permission_errors.append(f"Lead {lead_id}: Not assigned to you")
                else:
                    permission_errors.append(f"Lead {lead_id}: No permission to delete")
                    
            except Lead.DoesNotExist:
                permission_errors.append(f"Lead {lead_id}: Not found")
        
        if not leads_to_delete and permission_errors:
            return Response(
                {'error': 'No leads could be deleted', 'details': permission_errors}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Perform bulk deletion
        deleted_count = 0
        deletion_errors = []
        
        try:
            with transaction.atomic():
                for lead in leads_to_delete:
                    try:
                        lead_name = lead.name
                        lead_id = lead.id
                        lead.delete()
                        deleted_count += 1
                        print(f"DEBUG: Successfully deleted lead {lead_id} ({lead_name})")
                    except Exception as e:
                        deletion_errors.append(f"Lead {lead.id}: {str(e)}")
                        print(f"ERROR: Failed to delete lead {lead.id}: {e}")
                
                print(f"SUCCESS: Bulk deleted {deleted_count} leads")
                
        except Exception as e:
            print(f"ERROR: Bulk deletion transaction failed: {e}")
            return Response(
                {'error': 'Bulk deletion failed', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Prepare response
        response_data = {
            'deleted_count': deleted_count,
            'requested_count': len(lead_ids),
            'success': True
        }
        
        if permission_errors:
            response_data['permission_errors'] = permission_errors
        
        if deletion_errors:
            response_data['deletion_errors'] = deletion_errors
        
        return Response(response_data, status=status.HTTP_200_OK)