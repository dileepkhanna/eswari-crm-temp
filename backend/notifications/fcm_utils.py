"""
Firebase Cloud Messaging utilities for mobile push notifications.
Works alongside web push notifications (pywebpush) without interference.
"""
import logging

logger = logging.getLogger(__name__)


def _is_firebase_initialized():
    """Check if Firebase Admin SDK is initialized."""
    try:
        import firebase_admin
        return len(firebase_admin._apps) > 0
    except ImportError:
        return False


def send_fcm_notification(user, title, body, data=None):
    """
    Send FCM notification to a single user's mobile devices.
    
    Args:
        user: User object
        title: Notification title
        body: Notification body/message
        data: Optional dict of custom data
    
    Returns:
        bool: True if at least one notification was sent successfully
    """
    if not _is_firebase_initialized():
        logger.warning('Firebase Admin SDK not initialized. Skipping FCM notification.')
        return False
    
    try:
        from firebase_admin import messaging
        from .models import FCMToken
        
        # Get all active FCM tokens for this user
        tokens = list(FCMToken.objects.filter(user=user, is_active=True).values_list('token', flat=True))
        
        if not tokens:
            logger.info(f'No active FCM tokens for user {user.username}')
            return False
        
        # Prepare the message
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=tokens,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    channel_id='high_importance_channel',
                    sound='default',
                    priority='high',
                ),
            ),
        )
        
        # Send the message (send_each_for_multicast is the new API in firebase-admin v6+)
        response = messaging.send_each_for_multicast(message)
        
        logger.info(
            f'FCM sent to {user.username}: '
            f'{response.success_count} success, {response.failure_count} failures'
        )
        
        # Deactivate invalid tokens
        if response.failure_count > 0:
            for idx, result in enumerate(response.responses):
                if not result.success:
                    token = tokens[idx]
                    error_code = result.exception.code if result.exception else 'unknown'
                    logger.warning(f'FCM failed for token {token[:20]}...: {error_code}')
                    
                    # Deactivate tokens with permanent errors
                    if error_code in ['NOT_FOUND', 'INVALID_ARGUMENT', 'UNREGISTERED']:
                        FCMToken.objects.filter(token=token).update(is_active=False)
                        logger.info(f'Deactivated invalid FCM token: {token[:20]}...')
        
        return response.success_count > 0
        
    except ImportError:
        logger.error('firebase-admin package not installed. Install with: pip install firebase-admin')
        return False
    except Exception as e:
        logger.error(f'Error sending FCM notification to {user.username}: {e}', exc_info=True)
        return False


def send_bulk_fcm_notification(users, title, body, data=None):
    """
    Send FCM notification to multiple users.
    
    Args:
        users: List or queryset of User objects
        title: Notification title
        body: Notification body/message
        data: Optional dict of custom data
    
    Returns:
        int: Number of users who received at least one notification
    """
    if not _is_firebase_initialized():
        logger.warning('Firebase Admin SDK not initialized. Skipping bulk FCM notification.')
        return 0
    
    user_list = list(users)
    success_count = sum(
        1 for user in user_list
        if send_fcm_notification(user, title, body, data)
    )
    
    logger.info(f'Sent FCM notifications to {success_count}/{len(user_list)} users')
    return success_count


def send_fcm_to_tokens(tokens, title, body, data=None):
    """
    Send FCM notification directly to a list of tokens.
    Useful for sending to specific devices without user lookup.
    
    Args:
        tokens: List of FCM token strings
        title: Notification title
        body: Notification body/message
        data: Optional dict of custom data
    
    Returns:
        tuple: (success_count, failure_count)
    """
    if not _is_firebase_initialized():
        logger.warning('Firebase Admin SDK not initialized. Skipping FCM notification.')
        return (0, 0)
    
    if not tokens:
        return (0, 0)
    
    try:
        from firebase_admin import messaging
        
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=tokens,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    channel_id='high_importance_channel',
                    sound='default',
                    priority='high',
                ),
            ),
        )
        
        response = messaging.send_each_for_multicast(message)
        
        logger.info(
            f'FCM sent to {len(tokens)} tokens: '
            f'{response.success_count} success, {response.failure_count} failures'
        )
        
        return (response.success_count, response.failure_count)
        
    except Exception as e:
        logger.error(f'Error sending FCM to tokens: {e}', exc_info=True)
        return (0, len(tokens))
