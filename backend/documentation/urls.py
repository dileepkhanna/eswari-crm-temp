from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_documentation, name='list_documentation'),
    path('content/<path:document_path>/', views.get_document_content, name='get_document_content'),
    path('download/<path:document_path>/', views.download_document, name='download_document'),
]