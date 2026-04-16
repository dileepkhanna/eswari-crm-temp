from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet, basename='company')

urlpatterns = [
    # Admin setup endpoints
    path('setup/admin/', views.create_initial_admin, name='create_initial_admin'),
    path('setup/check/', views.check_admin_exists, name='check_admin_exists'),
    
    # Regular endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.login_view, name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    path('profile/change-password/', views.change_password_view, name='change_password'),
    path('profile/delete-account/', views.delete_account_view, name='delete_account'),
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/<int:user_id>/update/', views.admin_update_user_view, name='admin_update_user'),
    path('users/<int:user_id>/delete/', views.delete_user_view, name='delete_user'),
    path('users/<int:user_id>/promote/', views.promote_employee_to_manager_view, name='promote_employee'),
    path('users/<int:user_id>/approve/', views.approve_user_view, name='approve_user'),
    path('users/<int:user_id>/reject/', views.reject_user_view, name='reject_user'),
    path('users/simple-delete/', views.simple_delete_user_view, name='simple_delete_user'),
    path('users/pending/', views.pending_users_view, name='pending_users'),
    path('managers/', views.managers_list_view, name='managers_list'),

    # Invite link endpoints
    path('invite/generate/', views.generate_invite_view, name='generate_invite'),
    path('invite/validate/', views.validate_invite_view, name='validate_invite'),
    path('invite/register/', views.invite_register_view, name='invite_register'),
    
    # Include router URLs for ViewSets
    path('', include(router.urls)),
]