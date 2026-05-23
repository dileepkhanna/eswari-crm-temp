"""
WebSocket URL routing for Django Channels.

WebSocket endpoints:
  ws://host/ws/notifications/ — Real-time notifications (requires JWT token)
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]
