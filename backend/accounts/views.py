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
def login_view(request):
    email_or_username = request.data.get('email')  # This field can contain email or username
    password = request.data.get('password')
    
    if not email_or_username or not password:
        return Response({
            'error': 'Email/Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = None
    
    # Try to authenticate with email first (if provided and contains @)
    if '@' in email_or_username:
        # It's an email, find user by email
        try:
            user_obj = User.objects.get(email=email_or_username)
            # Authenticate using the username (since USERNAME_FIELD is username)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    else:
        # It's a username, authenticate directly
        user = authenticate(request, username=email_or_username, password=password)
    
    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
    else:
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