import json
import logging
from django.conf import settings
from django.utils import timezone
from .models import PushSubscription, Notification

logger = logging.getLogger(__name__)


def _normalize_vapid_private_key(key: str) -> str:
    """
    Normalize VAPID private key to PEM format.
    Handles both raw base64 and already-formatted PEM keys.
    """
    key = key.strip()
    if key.startswith('-----'):
        # Already PEM format — just ensure real newlines
        return key.replace('\\n', '\n')
    # Raw base64 — wrap in PEM headers
    # Split into 64-char lines
    lines = [key[i:i+64] for i in range(0, len(key), 64)]
    return '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(lines) + '\n-----END PRIVATE KEY-----'


def _send_webpush(subscription: PushSubscription, title: str, body: str, data: dict = None) -> bool:
    """Send a single Web Push notification via pywebpush (no Firebase needed)."""
    try:
        from pywebpush import webpush, WebPushException

        raw_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
        vapid_claims_email = getattr(settings, 'VAPID_CLAIMS_EMAIL', 'admin@eswaricrm.com')

        if not raw_key:
            logger.error('VAPID_PRIVATE_KEY not configured in settings')
            return False

        vapid_private_key = _normalize_vapid_private_key(raw_key)

        payload = json.dumps({
            'title': title,
            'body': body,
            'icon': '/favicon.ico',
            'badge': '/favicon.ico',
            'data': data or {},
        })

        webpush(
            subscription_info={
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh,
                    'auth': subscription.auth,
                },
            },
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims={'sub': f'mailto:{vapid_claims_email}'},
        )
        return True

    except Exception as e:
        err_str = str(e)
        logger.error(f'Web push send error for {subscription.endpoint[:40]}...: {err_str}')
        # 410 Gone = subscription expired/invalid, deactivate it
        if '410' in err_str or '404' in err_str:
            subscription.is_active = False
            subscription.save(update_fields=['is_active'])
        return False


def send_push_notification(user, title, message, notification_type='other', data=None, company=None):
    """
    Send a web push notification to a user via Django + pywebpush (no Firebase).
    Also creates a Notification record in the DB.
    """
    try:
        resolved_company = company or getattr(user, 'company', None)

        notification_kwargs = dict(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )
        if resolved_company:
            notification_kwargs['company'] = resolved_company

        notification = Notification.objects.create(**notification_kwargs)

        subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
        if not subscriptions.exists():
            logger.info(f'No active push subscriptions for user {user.username}')
            return False

        push_data = {
            'notification_id': str(notification.id),
            'type': notification_type,
            **(data or {}),
        }

        success_count = 0
        for sub in subscriptions:
            if _send_webpush(sub, title, message, push_data):
                success_count += 1

        if success_count > 0:
            notification.is_sent = True
            notification.sent_at = timezone.now()
            notification.save(update_fields=['is_sent', 'sent_at'])
            return True

        return False

    except Exception as e:
        logger.error(f'Error in send_push_notification: {e}')
        return False


def send_bulk_push_notification(users, title, message, notification_type='other', data=None, company=None):
    """Send push notification to multiple users."""
    user_list = list(users)
    success_count = sum(
        1 for user in user_list
        if send_push_notification(user, title, message, notification_type, data, company)
    )
    logger.info(f'Sent push notifications to {success_count}/{len(user_list)} users')
    return success_count
