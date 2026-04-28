from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    # Web Push (Browser)
    path('vapid-public-key/', views.vapid_public_key, name='vapid-public-key'),
    path('subscribe/', views.subscribe, name='push-subscribe'),
    path('unsubscribe/', views.unsubscribe, name='push-unsubscribe'),
    
    # Firebase Cloud Messaging (Mobile)
    path('fcm/register/', views.register_fcm_token, name='fcm-register'),
    path('fcm/unregister/', views.unregister_fcm_token, name='fcm-unregister'),
    
    # Testing
    path('test/', views.send_test_notification, name='test-notification'),
    
    # Notification CRUD
    path('', include(router.urls)),
]
