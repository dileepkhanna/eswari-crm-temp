from datetime import date
from django.contrib.auth import get_user_model
from .models import Birthday, BirthdayAnnouncement
from announcements.models import Announcement
from accounts.models import Company
from notifications.utils import send_bulk_push_notification
import logging

User = get_user_model()
logger = logging.getLogger(__name__)

class BirthdayAnnouncementService:
    """Service for creating automatic birthday announcements"""
    
    def create_daily_birthday_announcements(self):
        """Create birthday announcements for today's birthdays"""
        today = date.today()
        created_announcements = []
        
        # Get today's birthdays that should be announced
        today_birthdays = Birthday.objects.filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
            announce_birthday=True
        ).select_related('employee', 'employee__company')
        
        for birthday in today_birthdays:
            # Check if announcement already created for today
            if BirthdayAnnouncement.objects.filter(
                birthday=birthday,
                announcement_date=today
            ).exists():
                continue
            
            try:
                # Create the birthday announcement
                announcement = self._create_birthday_announcement(birthday)
                
                # Record that we created this announcement
                birthday_announcement = BirthdayAnnouncement.objects.create(
                    birthday=birthday,
                    announcement_date=today,
                    announcement_id=announcement.id
                )
                
                created_announcements.append({
                    'employee': birthday.employee.get_full_name(),
                    'announcement_id': announcement.id,
                    'birthday_announcement_id': birthday_announcement.id
                })
                
            except Exception as e:
                print(f"Failed to create birthday announcement for {birthday.employee.get_full_name()}: {e}")
                continue
        
        return created_announcements
    
    def _create_birthday_announcement(self, birthday):
        """Create a birthday announcement for a specific employee"""
        employee = birthday.employee
        
        # Create announcement title
        title = f"🎉 Happy Birthday {employee.first_name}!"
        
        # Create announcement message
        age_text = ""
        if birthday.show_age and birthday.age:
            age_text = f" turning {birthday.age}"
        
        message = f"""🎂 Today we celebrate {employee.get_full_name()}{age_text}!

Join us in wishing {employee.first_name} a wonderful birthday filled with joy, happiness, and success.

{employee.first_name}, we hope your special day is as amazing as you are! 🎈

Best wishes from the entire team! 🎊"""
        
        # Get all active companies for the announcement
        active_companies = Company.objects.filter(is_active=True)
        
        # Create the announcement
        announcement = Announcement.objects.create(
            title=title,
            message=message,
            priority='medium',
            target_roles=[],  # Empty means all roles
            is_active=True,
            created_by=self._get_system_user()
        )
        
        # Add all companies to the announcement
        announcement.companies.set(active_companies)
        
        # Send push notifications to all users in the employee's company
        try:
            if employee.company:
                # Get all active users from the same company
                company_users = User.objects.filter(
                    company=employee.company,
                    is_active=True
                ).exclude(id=employee.id)  # Don't send to the birthday person
                
                if company_users.exists():
                    # Create a shorter notification message for push
                    push_message = f"🎂 Today we celebrate {employee.get_full_name()}{age_text}! Join us in wishing {employee.first_name} a wonderful birthday! 🎈"
                    
                    # Send push notifications to all company users
                    sent_count = send_bulk_push_notification(
                        users=company_users,
                        title=title,
                        message=push_message,
                        notification_type='birthday',
                        data={
                            'announcement_id': str(announcement.id),
                            'employee_id': str(employee.id),
                            'employee_name': employee.get_full_name(),
                        },
                        company=employee.company
                    )
                    
                    logger.info(f"✅ Sent birthday push notifications to {sent_count}/{company_users.count()} users for {employee.get_full_name()}")
                else:
                    logger.info(f"ℹ️  No other users in company to notify about {employee.get_full_name()}'s birthday")
            else:
                logger.warning(f"⚠️  Employee {employee.get_full_name()} has no company assigned, skipping push notifications")
                
        except Exception as e:
            logger.error(f"❌ Failed to send birthday push notifications for {employee.get_full_name()}: {e}")
            # Don't fail the announcement creation if push notifications fail
        
        return announcement
    
    def _get_system_user(self):
        """Get a system user for creating announcements (preferably HR or Admin)"""
        # Try to find an HR user first
        hr_user = User.objects.filter(role='hr', is_active=True).first()
        if hr_user:
            return hr_user
        
        # Fall back to admin user
        admin_user = User.objects.filter(role='admin', is_active=True).first()
        if admin_user:
            return admin_user
        
        # Last resort: any active user
        return User.objects.filter(is_active=True).first()
    
    def get_birthday_statistics(self):
        """Get birthday statistics for dashboard"""
        today = date.today()
        
        # Today's birthdays
        today_count = Birthday.objects.filter(
            birth_date__month=today.month,
            birth_date__day=today.day,
            announce_birthday=True
        ).count()
        
        # This month's birthdays
        month_count = Birthday.objects.filter(
            birth_date__month=today.month,
            announce_birthday=True
        ).count()
        
        # Upcoming birthdays (next 7 days)
        upcoming_birthdays = []
        for birthday in Birthday.objects.filter(announce_birthday=True):
            if birthday.days_until_birthday is not None and 0 <= birthday.days_until_birthday <= 7:
                upcoming_birthdays.append(birthday)
        
        return {
            'today_count': today_count,
            'month_count': month_count,
            'upcoming_count': len(upcoming_birthdays),
            'total_birthdays': Birthday.objects.count()
        }