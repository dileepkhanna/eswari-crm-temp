from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ASECustomerViewSet

router = DefaultRouter()
router.register(r'customers', ASECustomerViewSet, basename='ase-customers')

urlpatterns = [
    path('ase/', include(router.urls)),
]