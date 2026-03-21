from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from holidays.models import Holiday
from datetime import date, timedelta

User = get_user_model()


class HRHolidayAccessTestCase(TestCase):
    """Test HR user can view all holidays"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
        
        # Create holidays
        self.holiday1 = Holiday.objects.create(
            name='New Year',
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 1),
            holiday_type='national',
            description='New Year celebration',
            created_by=self.admin
        )
        
        self.holiday2 = Holiday.objects.create(
            name='Independence Day',
            start_date=date(2024, 8, 15),
            end_date=date(2024, 8, 15),
            holiday_type='national',
            description='Independence Day',
            created_by=self.admin
        )
    
    def test_hr_can_view_all_holidays(self):
        """Test that HR user can view all holidays"""
        self.client.force_authenticate(user=self.hr_user)
        response = self.client.get('/api/holidays/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Should see all 2 holidays
    
    def test_employee_can_view_holidays(self):
        """Test that employee user can view holidays"""
        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/holidays/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # All users can view holidays


class HRHolidayCreationTestCase(TestCase):
    """Test HR user can create holidays"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
    
    def test_hr_can_create_holiday(self):
        """Test that HR user can create a holiday"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'name': 'Christmas',
            'start_date': '2024-12-25',
            'end_date': '2024-12-25',
            'holiday_type': 'national',
            'description': 'Christmas celebration'
        }
        
        response = self.client.post('/api/holidays/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Christmas')
        self.assertEqual(response.data['holiday_type'], 'national')
        
        # Verify holiday was created in database
        holiday = Holiday.objects.get(name='Christmas')
        self.assertEqual(holiday.holiday_type, 'national')
        self.assertEqual(holiday.created_by, self.hr_user)
    
    def test_hr_can_create_multi_day_holiday(self):
        """Test that HR can create multi-day holidays"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'name': 'Year End Break',
            'start_date': '2024-12-28',
            'end_date': '2024-12-31',
            'holiday_type': 'company',
            'description': 'Year end holidays'
        }
        
        response = self.client.post('/api/holidays/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Year End Break')
    
    def test_employee_cannot_create_holiday(self):
        """Test that employee user cannot create holidays"""
        self.client.force_authenticate(user=self.employee)
        
        data = {
            'name': 'Employee Holiday',
            'start_date': '2024-12-25',
            'end_date': '2024-12-25',
            'holiday_type': 'company',
            'description': 'This should fail'
        }
        
        response = self.client.post('/api/holidays/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HRHolidayUpdateTestCase(TestCase):
    """Test HR user can update holidays"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
        
        # Create holiday
        self.holiday = Holiday.objects.create(
            name='New Year',
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 1),
            holiday_type='national',
            description='New Year celebration',
            created_by=self.admin
        )
    
    def test_hr_can_update_holiday(self):
        """Test that HR user can update holidays"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'name': 'New Year Day',
            'start_date': '2024-01-01',
            'end_date': '2024-01-01',
            'holiday_type': 'national',
            'description': 'Updated description'
        }
        
        response = self.client.put(
            f'/api/holidays/{self.holiday.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'New Year Day')
        self.assertEqual(response.data['description'], 'Updated description')
        
        # Verify in database
        self.holiday.refresh_from_db()
        self.assertEqual(self.holiday.name, 'New Year Day')
    
    def test_hr_can_partial_update_holiday(self):
        """Test that HR can partially update holidays"""
        self.client.force_authenticate(user=self.hr_user)
        
        data = {
            'description': 'Partially updated description'
        }
        
        response = self.client.patch(
            f'/api/holidays/{self.holiday.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['description'], 'Partially updated description')
        self.assertEqual(response.data['name'], 'New Year')  # Name unchanged
    
    def test_employee_cannot_update_holiday(self):
        """Test that employee user cannot update holidays"""
        self.client.force_authenticate(user=self.employee)
        
        data = {
            'name': 'Updated by Employee',
            'start_date': '2024-01-01',
            'end_date': '2024-01-01',
            'holiday_type': 'national',
            'description': 'This should fail'
        }
        
        response = self.client.put(
            f'/api/holidays/{self.holiday.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class HRHolidayDeleteTestCase(TestCase):
    """Test HR user can delete holidays"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user
        self.hr_user = User.objects.create_user(
            username='hr_user',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            first_name='HR',
            last_name='User'
        )
        
        # Create manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='testpass123',
            role='manager',
            first_name='Manager',
            last_name='User'
        )
        
        # Create employee user
        self.employee = User.objects.create_user(
            username='employee_user',
            email='employee@test.com',
            password='testpass123',
            role='employee',
            first_name='Employee',
            last_name='User',
            manager=self.manager
        )
        
        # Create holiday
        self.holiday = Holiday.objects.create(
            name='New Year',
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 1),
            holiday_type='national',
            description='New Year celebration',
            created_by=self.admin
        )
    
    def test_hr_can_delete_holiday(self):
        """Test that HR user can delete holidays"""
        self.client.force_authenticate(user=self.hr_user)
        
        response = self.client.delete(f'/api/holidays/{self.holiday.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify holiday was deleted
        self.assertFalse(Holiday.objects.filter(id=self.holiday.id).exists())
    
    def test_employee_cannot_delete_holiday(self):
        """Test that employee user cannot delete holidays"""
        self.client.force_authenticate(user=self.employee)
        
        response = self.client.delete(f'/api/holidays/{self.holiday.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify holiday still exists
        self.assertTrue(Holiday.objects.filter(id=self.holiday.id).exists())
    
    def test_manager_can_delete_holiday(self):
        """Test that manager user can delete holidays (managers have permission)"""
        self.client.force_authenticate(user=self.manager)
        
        response = self.client.delete(f'/api/holidays/{self.holiday.id}/')
        
        # Manager should be able to delete (based on HolidayPermission class)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

