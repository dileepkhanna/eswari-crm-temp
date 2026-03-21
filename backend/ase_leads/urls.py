from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ASELeadViewSet

router = DefaultRouter()
router.register(r'ase-leads', ASELeadViewSet, basename='ase-leads')

urlpatterns = [
    path('', include(router.urls)),
]