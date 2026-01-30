from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

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
    path('users/simple-delete/', views.simple_delete_user_view, name='simple_delete_user'),
    path('managers/', views.managers_list_view, name='managers_list'),
]