from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db import models
from .serializers import UserSerializer, UserRegistrationSerializer

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def create_initial_admin(request):
    """Create the first admin user - only works if no admin exists"""
    
    # Check if any admin already exists
    if User.objects.filter(role='admin').exists():
        return Response({
            'error': 'Admin user already exists. Please login with existing admin credentials.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Required fields for admin creation
    required_fields = ['first_name', 'last_name', 'email', 'password']
    missing_fields = [field for field in required_fields if not request.data.get(field)]
    
    if missing_fields:
        return Response({
            'error': f'Missing required fields: {", ".join(missing_fields)}'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create the admin user
        admin_data = {
            'first_name': request.data.get('first_name'),
            'last_name': request.data.get('last_name'),
            'email': request.data.get('email'),
            'phone': request.data.get('phone', ''),
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
        }
        
        # Create user instance to generate username
        admin_user = User(**admin_data)
        admin_user.username = admin_user.generate_username()
        admin_user.set_password(request.data.get('password'))
        admin_user.save()
        
        # Generate tokens for immediate login
        refresh = RefreshToken.for_user(admin_user)
        
        return Response({
            'message': 'Initial admin user created successfully',
            'user': UserSerializer(admin_user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': 'Failed to create admin user',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_admin_exists(request):
    """Check if any admin user exists in the system"""
    admin_exists = User.objects.filter(role='admin').exists()
    return Response({
        'admin_exists': admin_exists,
        'needs_setup': not admin_exists
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email_or_username = request.data.get('email')  # This field can contain email or username
    password = request.data.get('password')
    
    # Temporary debug logging to help troubleshoot login issues
    print(f"LOGIN DEBUG - Received: email_or_username='{email_or_username}', password_length={len(password) if password else 0}")
    
    if not email_or_username or not password:
        print("LOGIN DEBUG - Missing credentials")
        return Response({
            'error': 'Email/Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = None
    
    # Try to authenticate with email first (if provided and contains @)
    if '@' in email_or_username:
        # It's an email, find user by email
        try:
            user_obj = User.objects.get(email=email_or_username)
            print(f"LOGIN DEBUG - Found user by email: {user_obj.username}")
            # Authenticate using the username (since USERNAME_FIELD is username)
            user = authenticate(request, username=user_obj.username, password=password)
            print(f"LOGIN DEBUG - Email auth result: {user is not None}")
        except User.DoesNotExist:
            print(f"LOGIN DEBUG - No user found with email: {email_or_username}")
            pass
    else:
        # It's a username, authenticate directly
        print(f"LOGIN DEBUG - Trying username auth: {email_or_username}")
        user = authenticate(request, username=email_or_username, password=password)
        print(f"LOGIN DEBUG - Username auth result: {user is not None}")
    
    if user is not None:
        print(f"LOGIN DEBUG - Success for user: {user.username}")
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    else:
        print("LOGIN DEBUG - Authentication failed")
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated]  # Only authenticated users (admins) can create users

    def create(self, request, *args, **kwargs):
        # Only admins can create users
        if request.user.role != 'admin':
            return Response({
                'error': 'Only administrators can create users'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.save()
            return Response({
                'user': UserSerializer(user).data,
                'message': 'User created successfully'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'error': 'Failed to create user',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """Update user profile information"""
    user = request.user
    
    # Only allow updating certain fields
    allowed_fields = ['first_name', 'last_name', 'email', 'phone']
    update_data = {key: value for key, value in request.data.items() if key in allowed_fields}
    
    # Handle empty email
    if 'email' in update_data:
        email = update_data['email'].strip()
        if not email:
            update_data['email'] = None
    
    # Validate email uniqueness if provided
    if 'email' in update_data and update_data['email']:
        existing_user = User.objects.filter(email=update_data['email']).exclude(id=user.id).first()
        if existing_user:
            return Response({
                'error': 'Email address is already in use by another user'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update user fields
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.save()
        
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to update profile',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change user password"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not current_password or not new_password:
        return Response({
            'error': 'Both current and new passwords are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify current password
    if not user.check_password(current_password):
        return Response({
            'error': 'Current password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate new password
    try:
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        validate_password(new_password, user)
    except ValidationError as e:
        # Extract user-friendly error messages
        error_messages = []
        if hasattr(e, 'messages'):
            error_messages = e.messages
        elif hasattr(e, 'message'):
            error_messages = [e.message]
        else:
            error_messages = [str(e)]
        
        # Make error messages more user-friendly
        friendly_messages = []
        for msg in error_messages:
            if 'too similar' in msg.lower():
                friendly_messages.append('Password is too similar to your personal information. Please choose a different password.')
            elif 'too common' in msg.lower():
                friendly_messages.append('This password is too common. Please choose a more unique password.')
            elif 'too short' in msg.lower():
                friendly_messages.append('Password must be at least 8 characters long.')
            elif 'entirely numeric' in msg.lower():
                friendly_messages.append('Password cannot be entirely numeric. Please include letters.')
            else:
                friendly_messages.append(msg)
        
        return Response({
            'error': 'Password validation failed',
            'details': friendly_messages
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Password validation failed',
            'details': [str(e)]
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to change password',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    """Delete user account with admin password confirmation"""
    user = request.user
    admin_password = request.data.get('admin_password')
    
    if not admin_password:
        return Response({
            'error': 'Admin password is required to delete account'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Only admins can delete their own account
    if user.role != 'admin':
        return Response({
            'error': 'Only administrators can delete accounts'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Verify admin password
    if not user.check_password(admin_password):
        return Response({
            'error': 'Admin password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get user info before deletion
        user_name = f"{user.first_name} {user.last_name}".strip() or user.username
        user_id = user.id
        
        # Delete all related data
        from django.db import transaction
        
        with transaction.atomic():
            # Delete ALL data from the system (complete reset)
            
            # Delete all leads
            try:
                from leads.models import Lead
                leads_deleted = Lead.objects.count()
                Lead.objects.all().delete()
            except ImportError:
                leads_deleted = 0
            
            # Delete all tasks
            try:
                from tasks.models import Task
                tasks_deleted = Task.objects.count()
                Task.objects.all().delete()
            except ImportError:
                tasks_deleted = 0
            
            # Delete all projects
            try:
                from projects.models import Project
                projects_deleted = Project.objects.count()
                Project.objects.all().delete()
            except ImportError:
                projects_deleted = 0
            
            # Delete all customers
            try:
                from customers.models import Customer
                customers_deleted = Customer.objects.count()
                Customer.objects.all().delete()
            except ImportError:
                customers_deleted = 0
            
            # Delete all call allocations
            try:
                from customers.models import CallAllocation
                allocations_deleted = CallAllocation.objects.count()
                CallAllocation.objects.all().delete()
            except ImportError:
                allocations_deleted = 0
            
            # Delete all leaves
            try:
                from leaves.models import Leave
                leaves_deleted = Leave.objects.count()
                Leave.objects.all().delete()
            except ImportError:
                leaves_deleted = 0
            
            # Delete all announcements
            try:
                from announcements.models import Announcement
                announcements_deleted = Announcement.objects.count()
                Announcement.objects.all().delete()
            except ImportError:
                announcements_deleted = 0
            
            # Delete all activity logs
            try:
                from activity_logs.models import ActivityLog
                activity_logs_deleted = ActivityLog.objects.count()
                ActivityLog.objects.all().delete()
            except ImportError:
                activity_logs_deleted = 0
            
            # Delete all holidays
            try:
                from holidays.models import Holiday
                holidays_deleted = Holiday.objects.count()
                Holiday.objects.all().delete()
            except ImportError:
                holidays_deleted = 0
            
            # Delete all users except the current admin (will be deleted last)
            users_deleted = User.objects.exclude(id=user_id).count()
            User.objects.exclude(id=user_id).delete()
            
            # Finally delete the admin account
            user.delete()
        
        return Response({
            'message': f'Admin account "{user_name}" deleted and entire system reset successfully',
            'deleted_data': {
                'leads': leads_deleted,
                'tasks': tasks_deleted,
                'projects': projects_deleted,
                'customers': customers_deleted,
                'call_allocations': allocations_deleted,
                'leaves': leaves_deleted,
                'announcements': announcements_deleted,
                'activity_logs': activity_logs_deleted,
                'holidays': holidays_deleted,
                'users': users_deleted + 1,  # +1 for the admin account itself
                'total_records_deleted': (
                    leads_deleted + tasks_deleted + projects_deleted + 
                    customers_deleted + allocations_deleted + leaves_deleted + 
                    announcements_deleted + activity_logs_deleted + holidays_deleted + 
                    users_deleted + 1
                )
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to delete account',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for user list

    def get_queryset(self):
        """Filter users based on role and manager relationship"""
        user = self.request.user
        
        if user.role == 'admin':
            # Admins can see all users
            return User.objects.all().order_by('-created_at')
        elif user.role == 'manager':
            # Managers can see their employees and other managers/admins
            return User.objects.filter(
                models.Q(manager=user) |  # Their employees
                models.Q(role__in=['admin', 'manager'])  # Other managers and admins
            ).order_by('-created_at')
        else:
            # Employees can only see themselves, their manager, and other managers/admins
            return User.objects.filter(
                models.Q(id=user.id) |  # Themselves
                models.Q(id=user.manager.id if user.manager else None) |  # Their manager
                models.Q(role__in=['admin', 'manager'])  # Other managers and admins
            ).order_by('-created_at')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def managers_list_view(request):
    """Get list of all managers for assignment purposes"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can access this endpoint'
        }, status=status.HTTP_403_FORBIDDEN)
    
    managers = User.objects.filter(role='manager').order_by('first_name', 'last_name')
    serializer = UserSerializer(managers, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user_view(request, user_id):
    """Delete a user - only admins can delete users"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can delete users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user_to_delete = User.objects.get(id=user_id)
        
        # Prevent admin from deleting themselves
        if user_to_delete.id == request.user.id:
            return Response({
                'error': 'You cannot delete your own account'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent deleting the last admin
        if user_to_delete.role == 'admin':
            admin_count = User.objects.filter(role='admin').count()
            if admin_count <= 1:
                return Response({
                    'error': 'Cannot delete the last admin user'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        user_name = f"{user_to_delete.first_name} {user_to_delete.last_name}".strip() or user_to_delete.username
        user_to_delete.delete()
        
        return Response({
            'message': f'User "{user_name}" has been deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to delete user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)