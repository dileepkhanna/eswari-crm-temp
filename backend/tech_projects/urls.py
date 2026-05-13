from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TechProjectViewSet, TechTaskViewSet

router = DefaultRouter()
router.register(r'projects', TechProjectViewSet, basename='tech-project')
router.register(r'tasks', TechTaskViewSet, basename='tech-task')

urlpatterns = [
    path('', include(router.urls)),
]
