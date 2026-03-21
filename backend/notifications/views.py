from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from .models import PushSubscription, Notification
from .serializers import PushSubscriptionSerializer, NotificationSerializer
from .utils import send_push_notification


@api_view(['GET'])
@permission_classes([AllowAny])
def vapid_public_key(request):
    """Return the VAPID public key for the frontend to use when subscribing."""
    return Response({'vapid_public_key': getattr(settings, 'VAPID_PUBLIC_KEY', '')})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_push(request):
    """Subscribe user to web push notifications (Web Push Protocol, no Firebase)."""
    try:
        # Web Push subscription format:
        # { endpoint: "https://...", keys: { p256dh: "...", auth: "..." } }
        data = request.data
        endpoint = data.get('endpoint')
        keys = data.get('keys', {})
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')

        if not all([endpoint, p256dh, auth]):
            return Response(
                {'error': 'Invalid subscription: endpoint, keys.p256dh and keys.auth are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscription, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': p256dh,
                'auth': auth,
                'is_active': True,
            }
        )
        return Response(
            {'message': 'Subscribed successfully'},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unsubscribe_push(request):
    """Unsubscribe user from web push notifications."""
    try:
        endpoint = request.data.get('endpoint')
        if not endpoint:
            return Response({'error': 'endpoint required'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).update(is_active=False)
        return Response({'message': 'Unsubscribed successfully'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_notification(request):
    """Send a test push notification to the current user."""
    try:
        send_push_notification(
            user=request.user,
            title='Test Notification',
            message='Push notifications are working correctly!',
            notification_type='other',
        )
        return Response({'message': 'Test notification sent'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def get_list_queryset(self):
        """Paginated queryset for list actions only."""
        return self.get_queryset()[:100]

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
        notification.save()
        return Response({'message': 'Marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'message': 'All marked as read'})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response({'message': 'All notifications cleared'})
