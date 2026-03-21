from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models, transaction
from .models import Lead
from .serializers import LeadSerializer
from accounts.permissions import filter_by_user_access, can_hr_access_module, CompanyAccessPermission
from utils.mixins import CompanyFilterMixin


class LeadPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class LeadViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [CompanyAccessPermission]
    pagination_class = LeadPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to', 'requirement_type']
    search_fields = ['name', 'email', 'address', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-created_at']
    
    def check_permissions(self, request):
        """Block HR users from accessing leads"""
        super().check_permissions(request)
        if request.user.role == 'hr':
            raise PermissionDenied("Access denied. HR users do not have permission to access this module.")
    
    def get_queryset(self):
        """
        Role-based lead filtering with optimized queries
        """
        user = self.request.user
        
        # Base queryset with optimized joins
        base_queryset = Lead.objects.select_related(
            'company', 'assigned_to', 'created_by'
        ).prefetch_related(
            'assigned_to__employees'  # For manager queries
        )
        
        # Use the centralized permission filter
        queryset = filter_by_user_access(
            base_queryset,
            user,
            assigned_to_field='assigned_to',
            created_by_field='created_by'
        )
        
        return queryset
    
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
    def bulk_import(self, request):
        """
        Bulk import leads in a single DB transaction.
        Expects: {"leads": [{...}, ...]}
        Returns: {"imported": N, "errors": [...]}
        """
        rows = request.data.get('leads', [])
        if not isinstance(rows, list) or len(rows) == 0:
            return Response({'error': 'No leads provided'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        company = getattr(user, 'company', None)
        if not company:
            return Response({'error': 'User has no company assigned'}, status=status.HTTP_400_BAD_REQUEST)

        to_create = []
        errors = []

        for i, row in enumerate(rows):
            try:
                obj = Lead(
                    name=row.get('name', ''),
                    phone=row.get('phone', ''),
                    email=row.get('email', ''),
                    address=row.get('address', ''),
                    requirement_type=row.get('requirement_type', 'apartment'),
                    bhk_requirement=row.get('bhk_requirement', '2'),
                    budget_min=row.get('budget_min', 0) or 0,
                    budget_max=row.get('budget_max', 0) or 0,
                    preferred_location=row.get('preferred_location', ''),
                    status=row.get('status', 'new'),
                    source=row.get('source', 'website'),
                    description=row.get('description', ''),
                    company=company,
                    created_by=user,
                )
                to_create.append(obj)
            except Exception as e:
                errors.append({'row': i + 1, 'error': str(e)})

        imported = 0
        if to_create:
            with transaction.atomic():
                created = Lead.objects.bulk_create(to_create, batch_size=500)
                imported = len(created)

        return Response({'imported': imported, 'errors': errors}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
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

    @action(detail=False, methods=['post'])
    def bulk_delete_by_filter(self, request):
        """
        Delete all leads matching the given filters (search, status, source, etc.)
        Used for cross-page "select all matching" bulk delete.
        Expects: {"search": "...", "status": "new", ...}  (all optional)
        Returns: {"deleted_count": N}
        """
        user = request.user
        if user.role not in ['admin', 'manager']:
            raise PermissionDenied("Only admins and managers can bulk delete by filter.")

        # Build queryset using the same logic as get_queryset
        queryset = self.get_queryset()

        # Apply the same filters the frontend is using
        search = request.data.get('search', '').strip()
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(address__icontains=search) |
                Q(description__icontains=search)
            )

        status_filter = request.data.get('status', '').strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        source_filter = request.data.get('source', '').strip()
        if source_filter:
            queryset = queryset.filter(source=source_filter)

        count = queryset.count()
        with transaction.atomic():
            queryset.delete()

        return Response({'deleted_count': count}, status=status.HTTP_200_OK)