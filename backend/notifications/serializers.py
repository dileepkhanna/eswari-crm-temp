from rest_framework import serializers
from .models import PushSubscription, Notification


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'created_at', 'is_active']
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'data',
            'is_read', 'is_sent', 'sent_at', 'created_at'
        ]
        read_only_fields = ['id', 'is_sent', 'sent_at', 'created_at']
