"""
Birthday announcement tasks for automated execution.
This module contains tasks that can be run via cron jobs or scheduled tasks.
"""

import logging
from datetime import date
from django.core.management import call_command
from .services import BirthdayAnnouncementService

logger = logging.getLogger(__name__)

def create_daily_birthday_announcements():
    """
    Task to create birthday announcements for today's birthdays.
    This function is designed to be called by a cron job or scheduled task.
    """
    try:
        logger.info(f"Starting daily birthday announcement creation for {date.today()}")
        
        service = BirthdayAnnouncementService()
        created_announcements = service.create_daily_birthday_announcements()
        
        if created_announcements:
            logger.info(f"Successfully created {len(created_announcements)} birthday announcements:")
            for announcement in created_announcements:
                logger.info(f"  - {announcement['employee']}")
        else:
            logger.info("No birthday announcements needed today")
            
        return {
            'success': True,
            'count': len(created_announcements),
            'announcements': created_announcements
        }
        
    except Exception as e:
        logger.error(f"Error creating daily birthday announcements: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def cleanup_old_birthday_announcements(days_to_keep=365):
    """
    Task to clean up old birthday announcement records.
    Keeps records for the specified number of days (default: 1 year).
    """
    try:
        from datetime import timedelta
        from .models import BirthdayAnnouncement
        
        cutoff_date = date.today() - timedelta(days=days_to_keep)
        
        old_announcements = BirthdayAnnouncement.objects.filter(
            announcement_date__lt=cutoff_date
        )
        
        count = old_announcements.count()
        old_announcements.delete()
        
        logger.info(f"Cleaned up {count} old birthday announcement records")
        
        return {
            'success': True,
            'cleaned_count': count
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old birthday announcements: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def get_birthday_statistics():
    """
    Task to generate birthday statistics for reporting.
    """
    try:
        service = BirthdayAnnouncementService()
        stats = service.get_birthday_statistics()
        
        logger.info(f"Birthday statistics: {stats}")
        
        return {
            'success': True,
            'statistics': stats
        }
        
    except Exception as e:
        logger.error(f"Error generating birthday statistics: {e}")
        return {
            'success': False,
            'error': str(e)
        }