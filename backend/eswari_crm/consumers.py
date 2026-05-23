"""
WebSocket consumers for real-time CRM updates.

Provides real-time notifications for:
- New lead assignments
- Task assignments and status changes
- Deal closures
- System announcements

Usage:
  Connect to: ws://host/ws/notifications/
  Authentication: Pass JWT token as query param: ws://host/ws/notifications/?token=<jwt>
"""

import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)
User = get_user_model()
 
class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.    
    Each authenticated user joins their own group: 'user_{user_id}'
    Admins also join: 'role_admin'
    Managers join: 'role_manager'
    Company members join: 'company_{company_id}'
    """

    async def connect(self):
        """Authenticate and join appropriate groups."""
        self.user = await self._authenticate()
        
        if not self.user:
            await self.close(code=4001)
            return

        # Join user-specific group
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Join role group
        self.role_group = f"role_{self.user.role}"
        await self.channel_layer.group_add(self.role_group, self.channel_name)

        # Join company group
        if self.user.company_id:
            self.company_group = f"company_{self.user.company_id}"
            await self.channel_layer.group_add(self.company_group, self.channel_name)
        else:
            self.company_group = None

        # Join broadcast group (all users)
        await self.channel_layer.group_add("broadcast", self.channel_name)

        await self.accept()
        # Send connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'user_id': self.user.id,
            'message': 'Connected to real-time notifications',
        })

    async def disconnect(self, close_code):
        """Leave all groups on disconnect."""
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if hasattr(self, 'role_group'):
            await self.channel_layer.group_discard(self.role_group, self.channel_name)
        if hasattr(self, 'company_group') and self.company_group:
            await self.channel_layer.group_discard(self.company_group, self.channel_name)
        await self.channel_layer.group_discard("broadcast", self.channel_name)

    async def receive_json(self, content):
        """Handle incoming messages (ping/pong for keepalive)."""
        if content.get('type') == 'ping':
            await self.send_json({'type': 'pong'})

    # ═══════════════════════════════════════════════════════════════════════
    # Event handlers (called when messages are sent to groups)
    # ═══════════════════════════════════════════════════════════════════════

    async def notification_message(self, event):
        """Send notification to WebSocket client."""
        await self.send_json({
            'type': 'notification',
            'data': event['data'],
        })

    async def lead_assigned(self, event):
        """New lead assigned to user."""
        await self.send_json({
            'type': 'lead_assigned',
            'data': event['data'],
        })

    async def task_assigned(self, event):
        """Task assigned to user."""
        await self.send_json({
            'type': 'task_assigned',
            'data': event['data'],
        })

    async def deal_closed(self, event):
        """Deal won/lost notification."""
        await self.send_json({
            'type': 'deal_closed',
            'data': event['data'],
        })

    async def announcement(self, event):
        """System announcement."""
        await self.send_json({
            'type': 'announcement',
            'data': event['data'],
        })

    async def status_update(self, event):
        """Entity status changed."""
        await self.send_json({
            'type': 'status_update',
            'data': event['data'],
        })

    # ═══════════════════════════════════════════════════════════════════════
    # Authentication
    # ═══════════════════════════════════════════════════════════════════════

    async def _authenticate(self):
        """Authenticate user from JWT token in query string."""
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(p.split('=', 1) for p in query_string.split('&') if '=' in p)
        token_str = params.get('token')

        if not token_str:
            return None

        try:
            token = AccessToken(token_str)
            user_id = token['user_id']
            user = await self._get_user(user_id)
            return user
        except (TokenError, Exception) as e:
            logger.warning(f"WebSocket auth failed: {e}")
            return None

    @database_sync_to_async
    def _get_user(self, user_id):
        """Fetch user from database."""
        try:
            return User.objects.select_related('company').get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return None
