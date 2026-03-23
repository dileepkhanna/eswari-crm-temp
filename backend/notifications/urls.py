from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('vapid-public-key/', views.vapid_public_key, name='vapid-public-key'),
    path('subscribe/', views.subscribe, name='push-subscribe'),
    path('unsubscribe/', views.unsubscribe, name='push-unsubscribe'),
    path('test/', views.send_test_notification, name='test-notification'),
    path('', include(router.urls)),
]
