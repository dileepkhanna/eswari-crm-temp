"""
Signal handlers for accounts app.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(pre_save, sender=User)
def clear_manager_on_company_change(sender, instance, **kwargs):
    """
    Clear manager assignment if user's company changes and manager is from different company.
    
    This ensures that manager assignments remain valid when a user is moved to a different company.
    If the new company doesn't match the manager's company, the manager assignment is cleared.
    """
    # Only process if this is an update (not a new user)
    if instance.pk:
        try:
            # Get the old instance from database
            old_instance = User.objects.get(pk=instance.pk)
            
            # Check if company has changed
            if old_instance.company_id != instance.company_id:
                # If user has a manager, check if manager is from the new company
                if instance.manager:
                    if instance.manager.company_id != instance.company_id:
                        # Clear manager assignment
                        logger.warning(
                            f"Clearing manager assignment for user {instance.username} "
                            f"due to company change from {old_instance.company} to {instance.company}"
                        )
                        instance.manager = None
        except User.DoesNotExist:
            # This shouldn't happen, but handle gracefully
            pass
