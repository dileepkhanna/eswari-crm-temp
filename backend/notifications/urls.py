from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('vapid-public-key/', views.vapid_public_key, name='vapid-public-key'),
    path('subscribe/', views.subscribe_push, name='subscribe-push'),
    path('unsubscribe/', views.unsubscribe_push, name='unsubscribe-push'),
    path('test/', views.send_test_notification, name='test-notification'),
    path('', include(router.urls)),
]
