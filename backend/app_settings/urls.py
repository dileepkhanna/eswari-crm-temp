from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_app_settings, name='get_app_settings'),
    path('update/', views.update_app_settings, name='update_app_settings'),
    path('upload-logo/', views.upload_logo, name='upload_logo'),
    path('upload-favicon/', views.upload_favicon, name='upload_favicon'),
    path('reset/', views.reset_app_settings, name='reset_app_settings'),
]