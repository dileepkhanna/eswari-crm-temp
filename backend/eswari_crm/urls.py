"""
URL configuration for eswari_crm project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, Http404
from django.views.static import serve
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_control
import os
from . import views

def serve_media_with_cors(request, path):
    """Serve media files with CORS headers"""
    try:
        response = serve(request, path, document_root=settings.MEDIA_ROOT)
        # Add CORS headers for media files
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    except Http404:
        raise Http404("Media file not found")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", views.health_check, name="health_check"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("leads.urls")),
    path("api/", include("projects.urls")),
    path("api/", include("tasks.urls")),
    path("api/leaves/", include("leaves.urls")),
    path("api/announcements/", include("announcements.urls")),
    path("api/activity-logs/", include("activity_logs.urls")),
    path("api/", include("holidays.urls")),
    path("api/", include("customers.urls")),
    path("api/app-settings/", include("app_settings.urls")),
]

# Add media URLs with CORS support
if settings.DEBUG:
    urlpatterns = static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + urlpatterns
else:
    # In production, serve media files with CORS headers
    urlpatterns += [
        path(f'{settings.MEDIA_URL.lstrip("/")}/<path:path>', serve_media_with_cors, name='media'),
    ]
