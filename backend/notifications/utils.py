import json
import logging
from django.conf import settings
from django.utils import timezone
from .models import PushSubscription, Notification

logger = logging.getLogger(__name__)


def _normalize_vapid_private_key(key: str) -> str:
    """Return VAPID private key in the format pywebpush expects."""
    key = key.strip()
    if key.startswith('-----'):
        return key.replace('\\n', '\n')
    return key


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
        if '410' in err_str or '404' in err_str:
            subscription.is_active = False
            subscription.save(update_fields=['is_active'])
        return False


def send_notification(user, title, message, notification_type='other', data=None, company=None):
    """Create an in-app Notification DB record."""
    try:
        resolved_company = company or getattr(user, 'company', None)
        kwargs = dict(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )
        if resolved_company:
            kwargs['company'] = resolved_company
        return Notification.objects.create(**kwargs)
    except Exception as e:
        logger.error(f'Error creating notification for {user}: {e}')
        return None


def send_push_notification(user, title, message, notification_type='other', data=None, company=None):
    """
    Create a DB notification AND send push notifications to all devices.
    Sends BOTH web push (browser) and FCM (mobile) notifications.
    Falls back gracefully if either service is unavailable.
    """
    try:
        # 1. Create in-app notification
        notification = send_notification(user, title, message, notification_type, data, company)

        # 2. Send Web Push (Browser)
        subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
        if subscriptions.exists():
            push_data = {
                'notification_id': str(notification.id) if notification else '',
                'type': notification_type,
                **(data or {}),
            }
            for sub in subscriptions:
                _send_webpush(sub, title, message, push_data)
        else:
            logger.info(f'No active web push subscriptions for user {user.username}')

        # 3. Send FCM (Mobile)
        try:
            from .fcm_utils import send_fcm_notification
            fcm_data = {
                'notification_id': str(notification.id) if notification else '',
                'type': notification_type,
                **(data or {}),
            }
            # Convert all data values to strings (FCM requirement)
            fcm_data = {k: str(v) for k, v in fcm_data.items()}
            send_fcm_notification(user, title, message, fcm_data)
        except ImportError:
            logger.debug('FCM utils not available, skipping mobile notifications')
        except Exception as e:
            logger.error(f'Error sending FCM notification: {e}')

        return True

    except Exception as e:
        logger.error(f'Error in send_push_notification: {e}')
        return False


def send_bulk_push_notification(users, title, message, notification_type='other', data=None, company=None):
    """
    Send push notification to multiple users.
    Sends BOTH web push (browser) and FCM (mobile) notifications.
    """
    user_list = list(users)
    
    # Send web push notifications
    success_count = sum(
        1 for user in user_list
        if send_push_notification(user, title, message, notification_type, data, company)
    )
    
    logger.info(f'Sent push notifications to {success_count}/{len(user_list)} users')
    return success_count
