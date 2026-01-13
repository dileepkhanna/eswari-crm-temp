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