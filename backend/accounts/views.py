from rest_framework import generics, status, permissions
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
        # Check if user is pending approval
        if hasattr(user, 'pending_approval') and user.pending_approval:
            print(f"LOGIN DEBUG - User pending approval: {user.username}")
            return Response({
                'error': 'Your account is pending admin approval. Please contact your administrator.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if user is inactive
        if not user.is_active:
            print(f"LOGIN DEBUG - User inactive: {user.username}")
            return Response({
                'error': 'Your account is inactive. Please contact your administrator.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if user's company is active (Requirement 2.6)
        # Admin/HR users may have no company assigned (global access)
        if user.company and not user.company.is_active:
            print(f"LOGIN DEBUG - Company inactive for user: {user.username}")
            return Response({
                'error': 'Your company account is inactive. Please contact your administrator.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"LOGIN DEBUG - Success for user: {user.username}")
        
        # Build company context for authentication response
        user_serializer = UserSerializer(user, context={'request': request})
        
        # Prepare company information with logo URL (None if no company assigned)
        if user.company:
            company_info = {
                'id': user.company.id,
                'name': user.company.name,
                'code': user.company.code,
                'logo_url': request.build_absolute_uri(user.company.logo.url) if user.company.logo else None
            }
        else:
            company_info = None
        
        # For admin/hr users, include list of all active companies
        # For manager/employee users, include only their assigned company
        if user.role in ['admin', 'hr']:
            from .models import Company
            active_companies = Company.objects.filter(is_active=True)
            companies_list = [{
                'id': company.id,
                'name': company.name,
                'code': company.code,
                'logo_url': request.build_absolute_uri(company.logo.url) if company.logo else None
            } for company in active_companies]
        else:
            # Company-restricted roles only get their assigned company
            companies_list = [company_info] if company_info else []
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': user_serializer.data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'company': company_info,  # User's assigned company
            'companies': companies_list,  # Available companies based on role
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
        # Only admins and HR can create users
        if request.user.role not in ['admin', 'hr']:
            return Response({
                'error': 'Only administrators and HR can create users'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # HR can only create manager and employee users
        if request.user.role == 'hr':
            role = request.data.get('role')
            if role not in ['manager', 'employee']:
                return Response({
                    'error': 'HR can only create manager and employee users'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Auto-assign creator's company if no company provided and creator has one
        data = request.data.copy()
        if not data.get('company') and request.user.company_id:
            data['company'] = request.user.company_id
        
        # If HR is creating the user, mark as pending approval and inactive
        if request.user.role == 'hr':
            data['pending_approval'] = True
            data['is_active'] = False  # User cannot log in until approved
            print(f"DEBUG: HR creating user - Setting pending_approval=True, is_active=False")
        
        print(f"DEBUG: User creation data: pending_approval={data.get('pending_approval')}, is_active={data.get('is_active')}")
        
        serializer = self.get_serializer(data=data)
        
        if not serializer.is_valid():
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.save()
            
            message = 'User created successfully'
            if user.pending_approval:
                message = 'User created and pending admin approval'
                
                # Create notifications for all admins
                try:
                    from notifications.models import Notification
                    from notifications.utils import send_push_notification
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    
                    # Get all admin users
                    admin_users = User.objects.filter(role='admin', is_active=True)
                    
                    # Create notification for each admin
                    user_name = f"{user.first_name} {user.last_name}".strip() or user.username
                    hr_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                    
                    notification_title = 'New User Pending Approval'
                    notification_message = f'{hr_name} created a new user "{user_name}" ({user.role}) that requires your approval.'
                    notification_data = {
                        'user_id': user.id,
                        'user_name': user_name,
                        'user_role': user.role,
                        'created_by': hr_name,
                        'action_url': '/admin/pending-users'
                    }
                    
                    for admin in admin_users:
                        # Create in-app notification
                        Notification.objects.create(
                            user=admin,
                            notification_type='system_alert',
                            title=notification_title,
                            message=notification_message,
                            data=notification_data,
                            company=user.company
                        )
                        
                        # Send browser push notification
                        try:
                            send_push_notification(
                                user=admin,
                                title=notification_title,
                                message=notification_message,
                                notification_type='system_alert',
                                data=notification_data,
                                company=user.company
                            )
                            print(f"Sent push notification to admin: {admin.username}")
                        except Exception as push_error:
                            print(f"Failed to send push notification to {admin.username}: {str(push_error)}")
                            # Continue even if push notification fails
                    
                    print(f"Created approval notifications for {admin_users.count()} admin(s)")
                    
                except Exception as e:
                    print(f"Failed to create approval notifications: {str(e)}")
                    # Don't fail user creation if notification fails
            
            return Response({
                'user': UserSerializer(user).data,
                'message': message,
                'pending_approval': user.pending_approval
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
        """Filter users based on strict role-based access control"""
        user = self.request.user
        
        if user.role == 'admin' or user.role == 'hr':
            # Admin and HR can see all users, but optionally filter by company
            company_id = self.request.query_params.get('company')
            qs = User.objects.all().order_by('-created_at')
            if company_id:
                qs = qs.filter(company_id=company_id)
            return qs
        
        elif user.role == 'manager':
            # Manager can see ONLY their assigned employees + themselves
            return User.objects.filter(
                models.Q(manager=user) |  # Their assigned employees only
                models.Q(id=user.id)      # Themselves
            ).order_by('-created_at')
        
        else:  # employee role
            # Employee can see ONLY themselves
            return User.objects.filter(id=user.id).order_by('-created_at')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def managers_list_view(request):
    """Get list of all managers for assignment purposes"""
    if request.user.role not in ['admin', 'hr']:
        return Response({
            'error': 'Only administrators and HR can access this endpoint'
        }, status=status.HTTP_403_FORBIDDEN)
    
    managers = User.objects.filter(role='manager').order_by('first_name', 'last_name')
    serializer = UserSerializer(managers, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def admin_update_user_view(request, user_id):
    """Admin and HR endpoint to update user information and password"""
    if request.user.role not in ['admin', 'hr']:
        return Response({
            'error': 'Only administrators and HR can update users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user_to_update = User.objects.get(id=user_id)
        
        # Get update data
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        address = request.data.get('address', '').strip()
        designation = request.data.get('designation', '').strip()
        joining_date = request.data.get('joining_date', '').strip()
        new_password = request.data.get('newPassword', '').strip()
        manager_id = request.data.get('managerId')
        company_id = request.data.get('company')
        # New personal/banking fields
        permanent_address = request.data.get('permanent_address', '').strip()
        present_address = request.data.get('present_address', '').strip()
        bank_name = request.data.get('bank_name', '').strip()
        bank_account_number = request.data.get('bank_account_number', '').strip()
        bank_ifsc = request.data.get('bank_ifsc', '').strip()
        blood_group = request.data.get('blood_group', '').strip()
        aadhar_number = request.data.get('aadhar_number', '').strip()
        # Emergency contacts
        emergency_contact1_name = request.data.get('emergency_contact1_name', '').strip()
        emergency_contact1_phone = request.data.get('emergency_contact1_phone', '').strip()
        emergency_contact1_relation = request.data.get('emergency_contact1_relation', '').strip()
        emergency_contact2_name = request.data.get('emergency_contact2_name', '').strip()
        emergency_contact2_phone = request.data.get('emergency_contact2_phone', '').strip()
        emergency_contact2_relation = request.data.get('emergency_contact2_relation', '').strip()
        
        # Validate required fields
        if not name:
            return Response({
                'error': 'Name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not phone:
            return Response({
                'error': 'Phone is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse name into first_name and last_name
        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # Update user fields
        user_to_update.first_name = first_name
        user_to_update.last_name = last_name
        user_to_update.phone = phone
        # Note: Django User model doesn't have address field by default
        # If you need address, you'll need to add it to your custom User model
        
        # Update email (optional field)
        if email:
            # Validate email uniqueness if provided
            existing_user = User.objects.filter(email=email).exclude(id=user_to_update.id).first()
            if existing_user:
                return Response({
                    'error': 'Email address is already in use by another user'
                }, status=status.HTTP_400_BAD_REQUEST)
            user_to_update.email = email
        else:
            user_to_update.email = None
        
        # Update designation (optional field)
        if designation:
            user_to_update.designation = designation
        else:
            user_to_update.designation = None
        
        # Update joining_date (optional field)
        if joining_date:
            user_to_update.joining_date = joining_date
        else:
            user_to_update.joining_date = None

        # Update personal/banking fields
        user_to_update.permanent_address = permanent_address or None
        user_to_update.present_address = present_address or None
        user_to_update.bank_name = bank_name or None
        user_to_update.bank_account_number = bank_account_number or None
        user_to_update.bank_ifsc = bank_ifsc or None
        user_to_update.blood_group = blood_group or None
        user_to_update.aadhar_number = aadhar_number or None
        # Update emergency contacts
        user_to_update.emergency_contact1_name = emergency_contact1_name or None
        user_to_update.emergency_contact1_phone = emergency_contact1_phone or None
        user_to_update.emergency_contact1_relation = emergency_contact1_relation or None
        user_to_update.emergency_contact2_name = emergency_contact2_name or None
        user_to_update.emergency_contact2_phone = emergency_contact2_phone or None
        user_to_update.emergency_contact2_relation = emergency_contact2_relation or None
        
        # Update company assignment if provided
        if company_id is not None:
            from .models import Company
            try:
                company = Company.objects.get(id=company_id, is_active=True)
                old_company = user_to_update.company
                user_to_update.company = company
                
                # If company changed, clear manager assignment (manager must be from same company)
                if old_company and old_company.id != company.id:
                    user_to_update.manager = None
                    
            except Company.DoesNotExist:
                return Response({
                    'error': 'Selected company not found or is inactive'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update manager assignment if provided
        if manager_id is not None:
            if manager_id == '' or manager_id == 'null' or manager_id == 'none':
                # Remove manager assignment
                user_to_update.manager = None
            else:
                try:
                    manager = User.objects.get(id=manager_id, role='manager')
                    # Validate manager is from same company
                    if manager.company_id != user_to_update.company_id:
                        return Response({
                            'error': 'Manager must be from the same company'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    user_to_update.manager = manager
                except User.DoesNotExist:
                    return Response({
                        'error': 'Selected manager not found'
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password if provided
        if new_password:
            # Validate new password
            try:
                from django.contrib.auth.password_validation import validate_password
                from django.core.exceptions import ValidationError
                validate_password(new_password, user_to_update)
                user_to_update.set_password(new_password)
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
                        friendly_messages.append('Password is too similar to user information. Please choose a different password.')
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
        
        user_to_update.save()
        
        user_name = f"{user_to_update.first_name} {user_to_update.last_name}".strip() or user_to_update.username
        response_data = {
            'message': f'User "{user_name}" updated successfully',
            'user': UserSerializer(user_to_update).data
        }
        
        if new_password:
            response_data['password_changed'] = True
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to update user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
        # Debug: Log what we're about to delete
        print(f"DEBUG: Attempting to delete user {user_id} ({user_name})")
        
        # Use transaction to ensure atomic deletion
        from django.db import transaction
        
        with transaction.atomic():
            # Get counts of related objects before deletion for logging
            related_counts = {}
            
            # Check related objects that will be deleted (CASCADE)
            try:
                from customers.models import Customer
                related_counts['customers_created'] = Customer.objects.filter(created_by=user_to_delete).count()
                related_counts['customers_assigned'] = Customer.objects.filter(assigned_to=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from leads.models import Lead
                related_counts['leads_created'] = Lead.objects.filter(created_by=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from tasks.models import Task
                related_counts['tasks_created'] = Task.objects.filter(created_by=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from leaves.models import Leave
                related_counts['leaves'] = Leave.objects.filter(user=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from activity_logs.models import ActivityLog
                related_counts['activity_logs'] = ActivityLog.objects.filter(user=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from announcements.models import Announcement, AnnouncementRead
                related_counts['announcements'] = Announcement.objects.filter(created_by=user_to_delete).count()
                related_counts['announcement_reads'] = AnnouncementRead.objects.filter(user=user_to_delete).count()
            except ImportError:
                pass
            
            try:
                from holidays.models import Holiday
                related_counts['holidays'] = Holiday.objects.filter(created_by=user_to_delete).count()
            except ImportError:
                pass
            
            print(f"DEBUG: Related objects to be deleted: {related_counts}")
            
            # Perform the deletion
            user_to_delete.delete()
            
            print(f"DEBUG: User {user_id} ({user_name}) deleted successfully")
        
        return Response({
            'message': f'User "{user_name}" has been deleted successfully',
            'deleted_related_objects': related_counts
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"DEBUG: Error deleting user {user_id}: {str(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        return Response({
            'error': 'Failed to delete user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def simple_delete_user_view(request):
    """Simple user deletion endpoint that accepts user ID in request body"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can delete users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({
            'error': 'user_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
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
        
        print(f"DEBUG: Simple delete - Attempting to delete user {user_id} ({user_name})")
        
        # Perform the deletion
        user_to_delete.delete()
        
        print(f"DEBUG: Simple delete - User {user_id} ({user_name}) deleted successfully")
        
        return Response({
            'message': f'User "{user_name}" has been deleted successfully',
            'user_id': user_id
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"DEBUG: Simple delete error for user {user_id}: {str(e)}")
        return Response({
            'error': 'Failed to delete user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_employee_to_manager_view(request, user_id):
    """Promote an employee to manager role"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can promote employees'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user_to_promote = User.objects.get(id=user_id)
        
        # Validate user is an employee
        if user_to_promote.role != 'employee':
            return Response({
                'error': f'User is currently a {user_to_promote.role}, only employees can be promoted to manager'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Store old information for announcement
        old_username = user_to_promote.username
        old_role = user_to_promote.role
        user_name = f"{user_to_promote.first_name} {user_to_promote.last_name}".strip() or user_to_promote.username
        
        # Update role and remove manager assignment
        user_to_promote.role = 'manager'
        user_to_promote.manager = None
        
        # Generate new username with manager role
        user_to_promote.username = user_to_promote.generate_username()
        
        # Save changes
        user_to_promote.save()
        
        # Create promotion announcement
        try:
            from announcements.models import Announcement
            from accounts.models import Company
            
            # Create promotion announcement
            announcement_title = f"🎉 Congratulations {user_to_promote.first_name}!"
            announcement_message = f"""🚀 We are excited to announce that {user_name} has been promoted to Manager!

{user_to_promote.first_name} has shown exceptional dedication and leadership qualities, and we're confident they will excel in their new role.

Please join us in congratulating {user_to_promote.first_name} on this well-deserved promotion! 👏

**Role Change:**
• Previous: Employee ({old_username})
• New: Manager ({user_to_promote.username})

We look forward to seeing the great things {user_to_promote.first_name} will accomplish as a manager!"""
            
            # Create the announcement
            announcement = Announcement.objects.create(
                title=announcement_title,
                message=announcement_message,
                priority='high',
                target_roles=[],  # Empty means all roles
                is_active=True,
                created_by=request.user
            )
            
            # Add all active companies to the announcement
            active_companies = Company.objects.filter(is_active=True)
            announcement.companies.set(active_companies)
            
            print(f"DEBUG: Created promotion announcement for {user_name} (ID: {announcement.id})")
            
        except Exception as e:
            print(f"DEBUG: Failed to create promotion announcement: {str(e)}")
            # Don't fail the promotion if announcement creation fails
        
        return Response({
            'message': f'{user_name} has been successfully promoted to Manager!',
            'user': UserSerializer(user_to_promote).data,
            'promotion_details': {
                'old_role': old_role,
                'new_role': 'manager',
                'old_username': old_username,
                'new_username': user_to_promote.username,
                'promoted_by': request.user.username,
                'promotion_date': user_to_promote.updated_at.isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"DEBUG: Error promoting user {user_id}: {str(e)}")
        return Response({
            'error': 'Failed to promote user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Company
from .serializers import CompanySerializer, CompanyListSerializer


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing companies.
    
    - Admin users can perform all CRUD operations
    - Other authenticated users can only view active companies
    - Supports multipart/form-data for logo upload
    - PROTECTED companies (Eswari Group, ASE Technologies) cannot be edited or deactivated
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    # These companies are fixed and cannot be modified
    PROTECTED_COMPANY_NAMES = ['Eswari Group', 'ASE Technologies', 'Eswari Capital']
    
    def get_permissions(self):
        """
        Only admins can create or update companies.
        """
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsAdminUser()]
        return super().get_permissions()
    
    def _is_protected(self, instance):
        return instance.name in self.PROTECTED_COMPANY_NAMES
    
    def get_queryset(self):
        """
        Admin and HR see all companies, others see only active companies.
        """
        if self.request.user.role in ['admin', 'hr']:
            return Company.objects.all()
        # Others see only active companies
        return Company.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        """
        Use lightweight serializer for list action.
        """
        if self.action == 'list':
            return CompanyListSerializer
        return CompanySerializer
    
    def partial_update(self, request, *args, **kwargs):
        """
        Handle partial updates (PATCH) for company.
        Properly handles is_active toggle without requiring all fields.
        """
        instance = self.get_object()
        
        # Block structural edits to protected companies, but allow logo/description updates
        if self._is_protected(instance):
            BLOCKED_FIELDS = {'name', 'code', 'is_active'}
            requested_fields = set(request.data.keys())
            if requested_fields & BLOCKED_FIELDS:
                return Response(
                    {'error': f'"{instance.name}" is a protected company and cannot be modified.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Convert 'true'/'false' strings to boolean for is_active
        if 'is_active' in request.data:
            is_active_value = request.data.get('is_active')
            if isinstance(is_active_value, str):
                request.data._mutable = True
                request.data['is_active'] = is_active_value.lower() == 'true'
                request.data._mutable = False
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Block full updates to protected companies."""
        instance = self.get_object()
        if self._is_protected(instance):
            return Response(
                {'error': f'"{instance.name}" is a protected company and cannot be modified.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get list of active companies.
        Endpoint: /api/companies/active/
        """
        companies = Company.objects.filter(is_active=True)
        serializer = CompanyListSerializer(companies, many=True, context={'request': request})
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Company deletion is disabled. Use deactivation instead."""
        return Response(
            {'error': 'Company deletion is not allowed. Please deactivate the company instead.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_users_view(request):
    """Get list of users pending approval - Admin only"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can view pending users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    pending_users = User.objects.filter(pending_approval=True).order_by('-created_at')
    serializer = UserSerializer(pending_users, many=True, context={'request': request})
    
    return Response({
        'count': pending_users.count(),
        'users': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_user_view(request, user_id):
    """Approve a pending user - Admin only"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can approve users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from django.utils import timezone
        
        user_to_approve = User.objects.get(id=user_id)
        
        if not user_to_approve.pending_approval:
            return Response({
                'error': 'User is not pending approval'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Approve the user
        user_to_approve.pending_approval = False
        user_to_approve.approved_by = request.user
        user_to_approve.approved_at = timezone.now()
        user_to_approve.is_active = True
        user_to_approve.save()
        
        user_name = f"{user_to_approve.first_name} {user_to_approve.last_name}".strip() or user_to_approve.username
        
        return Response({
            'message': f'User "{user_name}" has been approved successfully',
            'user': UserSerializer(user_to_approve, context={'request': request}).data
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to approve user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_user_view(request, user_id):
    """Reject a pending user (delete) - Admin only"""
    if request.user.role != 'admin':
        return Response({
            'error': 'Only administrators can reject users'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        user_to_reject = User.objects.get(id=user_id)
        
        if not user_to_reject.pending_approval:
            return Response({
                'error': 'User is not pending approval'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user_name = f"{user_to_reject.first_name} {user_to_reject.last_name}".strip() or user_to_reject.username
        
        # Delete the user
        user_to_reject.delete()
        
        return Response({
            'message': f'User "{user_name}" has been rejected and removed'
        }, status=status.HTTP_200_OK)
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to reject user',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Invite Link Views ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_invite_view(request):
    """Admin or HR generates a one-time invite link."""
    if request.user.role not in ['admin', 'hr']:
        return Response({'error': 'Only admin or HR can generate invite links'},
                        status=status.HTTP_403_FORBIDDEN)

    from .models import InviteToken, Company
    from django.utils import timezone
    import datetime

    role = request.data.get('role', 'employee')
    if role not in ['manager', 'employee']:
        return Response({'error': 'Role must be manager or employee'},
                        status=status.HTTP_400_BAD_REQUEST)

    company_id = request.data.get('company')
    company = None
    if company_id:
        try:
            company = Company.objects.get(id=company_id, is_active=True)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_400_BAD_REQUEST)
    elif request.user.company:
        company = request.user.company

    # Default expiry: 7 days
    expires_hours = int(request.data.get('expires_hours', 168))
    expires_at = timezone.now() + datetime.timedelta(hours=expires_hours)

    # Optional manager assignment
    manager_id = request.data.get('manager_id')
    manager = None
    if manager_id:
        try:
            manager = User.objects.get(id=manager_id, role='manager')
        except User.DoesNotExist:
            return Response({'error': 'Manager not found'}, status=status.HTTP_400_BAD_REQUEST)

    invite = InviteToken.objects.create(
        role=role,
        company=company,
        created_by=request.user,
        expires_at=expires_at,
        manager=manager,
    )

    return Response({
        'token': str(invite.token),
        'role': invite.role,
        'company': company.name if company else None,
        'manager': manager.get_full_name() or manager.username if manager else None,
        'expires_at': invite.expires_at.isoformat(),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([])
def validate_invite_view(request):
    """Validate an invite token (public endpoint)."""
    from .models import InviteToken
    token = request.query_params.get('token')
    if not token:
        return Response({'valid': False, 'error': 'Token is required'},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        invite = InviteToken.objects.select_related('company').get(token=token)
    except (InviteToken.DoesNotExist, Exception):
        return Response({'valid': False, 'error': 'Invalid token'},
                        status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid:
        reason = 'Token has already been used' if invite.used else 'Token has expired'
        return Response({'valid': False, 'error': reason}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'valid': True,
        'role': invite.role,
        'company_id': invite.company.id if invite.company else None,
        'company_name': invite.company.name if invite.company else None,
        'manager_id': invite.manager.id if invite.manager else None,
        'manager_name': (invite.manager.get_full_name() or invite.manager.username) if invite.manager else None,
    })


@api_view(['POST'])
@permission_classes([])
def invite_register_view(request):
    """User self-registers using an invite token."""
    from .models import InviteToken
    from django.utils import timezone

    token_str = request.data.get('token')
    if not token_str:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invite = InviteToken.objects.select_related('company').get(token=token_str)
    except (InviteToken.DoesNotExist, Exception):
        return Response({'error': 'Invalid token'}, status=status.HTTP_404_NOT_FOUND)

    if not invite.is_valid:
        reason = 'Token has already been used' if invite.used else 'Token has expired'
        return Response({'error': reason}, status=status.HTTP_400_BAD_REQUEST)

    # Required fields
    required = ['first_name', 'last_name', 'phone', 'password',
                'present_address', 'permanent_address',
                'bank_name', 'bank_account_number', 'bank_ifsc',
                'blood_group', 'aadhar_number',
                'emergency_contact1_name', 'emergency_contact1_phone', 'emergency_contact1_relation',
                'emergency_contact2_name', 'emergency_contact2_phone', 'emergency_contact2_relation',
                'designation', 'joining_date', 'email']
    missing = [f for f in required if not request.data.get(f, '').strip()]
    if missing:
        return Response({'error': f'Missing required fields: {", ".join(missing)}'},
                        status=status.HTTP_400_BAD_REQUEST)

    email = request.data.get('email', '').strip()
    if User.objects.filter(email=email).exists():
        return Response({'error': 'Email already in use'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        first_name = request.data['first_name'].strip()
        last_name = request.data['last_name'].strip()

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=request.data.get('phone', '').strip(),
            role=invite.role,
            company=invite.company,
            manager=invite.manager,
            designation=request.data.get('designation', '').strip(),
            joining_date=request.data.get('joining_date') or None,
            present_address=request.data.get('present_address', '').strip(),
            permanent_address=request.data.get('permanent_address', '').strip(),
            bank_name=request.data.get('bank_name', '').strip(),
            bank_account_number=request.data.get('bank_account_number', '').strip(),
            bank_ifsc=request.data.get('bank_ifsc', '').strip(),
            blood_group=request.data.get('blood_group', '').strip(),
            aadhar_number=request.data.get('aadhar_number', '').strip(),
            emergency_contact1_name=request.data.get('emergency_contact1_name', '').strip(),
            emergency_contact1_phone=request.data.get('emergency_contact1_phone', '').strip(),
            emergency_contact1_relation=request.data.get('emergency_contact1_relation', '').strip(),
            emergency_contact2_name=request.data.get('emergency_contact2_name', '').strip(),
            emergency_contact2_phone=request.data.get('emergency_contact2_phone', '').strip(),
            emergency_contact2_relation=request.data.get('emergency_contact2_relation', '').strip(),
            pending_approval=True,
            is_active=False,
        )
        user.username = user.generate_username()
        user.set_password(request.data['password'])
        user.save()

        # Mark invite as used
        invite.used = True
        invite.used_by = user
        invite.save(update_fields=['used', 'used_by'])

        # Notify all admins via web push
        try:
            from notifications.utils import send_push_notification
            admins = User.objects.filter(role='admin', is_active=True)
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            for admin in admins:
                send_push_notification(
                    user=admin,
                    title='New User Pending Approval',
                    message=f'{full_name} has registered and is awaiting your approval.',
                    notification_type='system_alert',
                    data={'url': '/admin/pending-users', 'user_id': str(user.id)},
                )
        except Exception as e:
            pass  # Don't fail registration if notification fails

        return Response({
            'message': 'Registration successful! Your account is pending admin approval.',
            'username': user.username,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': 'Registration failed', 'details': str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
