from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Notification, PushSubscription
from .serializers import NotificationSerializer
from .utils import send_notification


@api_view(['GET'])
@permission_classes([AllowAny])
def vapid_public_key(request):
    """Return the VAPID public key so the frontend can subscribe."""
    key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
    return Response({'vapid_public_key': key})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe(request):
    """Register a browser Web Push subscription with validation."""
    try:
        endpoint = request.data.get('endpoint')
        keys = request.data.get('keys', {})
        p256dh = keys.get('p256dh', '')
        auth = keys.get('auth', '')

        # Validate required fields
        if not endpoint or not p256dh or not auth:
            return Response({
                'error': 'endpoint, keys.p256dh and keys.auth are required'
            }, status=400)

        # Validate endpoint format
        if not endpoint.startswith('https://'):
            return Response({
                'error': 'Invalid endpoint URL - must be HTTPS'
            }, status=400)

        # Validate key lengths
        if len(p256dh) < 20 or len(auth) < 20:
            return Response({
                'error': 'Invalid encryption keys'
            }, status=400)

        # Create or update subscription
        subscription, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': p256dh,
                'auth': auth,
                'is_active': True
            },
        )

        action = 'created' if created else 'updated'
        return Response({
            'message': f'Subscription {action} successfully',
            'subscription_id': subscription.id
        })

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f'Subscription error for user {request.user.username}: {str(e)}')
        return Response({
            'error': 'Failed to register subscription. Please try again.'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unsubscribe(request):
    """Remove a browser Web Push subscription."""
    endpoint = request.data.get('endpoint')
    if endpoint:
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
    return Response({'message': 'Unsubscribed successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_notification(request):
    """Create a test in-app notification AND send a Web Push to the current user."""
    from .utils import send_push_notification
    send_push_notification(
        user=request.user,
        title='Test Notification',
        message='Push notifications are working correctly!',
        notification_type='other',
    )
    return Response({'message': 'Test notification sent'})


class NotificationViewSet(viewsets.ModelViewSet):
    """CRUD + actions for in-app notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()[:100]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'Marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'message': 'All marked as read'})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response({'message': 'All notifications cleared'})
