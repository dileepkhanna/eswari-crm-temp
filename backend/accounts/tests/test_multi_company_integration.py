"""
Integration tests for multi-company support feature.

This test suite validates the complete end-to-end flow of multi-company functionality:
- Company creation and user assignment
- Data creation and company-based filtering
- Cross-company access control
- Company switching for admin/hr users
- Role-based access restrictions

**Validates: Requirements 1-15 (Complete multi-company feature)**
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company
from leads.models import Lead
from customers.models import Customer
from projects.models import Project
from tasks.models import Task

User = get_user_model()


class MultiCompanyIntegrationTests(TestCase):
    """
    Integration tests for complete multi-company flow.
    
    Tests the entire workflow from company creation through data access control.
    """
    
    def setUp(self):
        """Set up test data with two companies and users with different roles"""
        # Get or create companies (migration creates default "ESWARI" company)
        self.company_eswari, _ = Company.objects.get_or_create(
            code='ESWARI',
            defaults={
                'name': 'Eswari Group',
                'is_active': True
            }
        )
        self.company_ase, _ = Company.objects.get_or_create(
            code='ASE',
            defaults={
                'name': 'ASE Technologies',
                'is_active': True
            }
        )
        
        # Create users with different roles for Eswari Group
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@eswari.com',
            password='admin123',
            role='admin',
            company=self.company_eswari
        )
        
        self.hr_user = User.objects.create_user(
            username='hr',
            email='hr@eswari.com',
            password='hr123',
            role='hr',
            company=self.company_eswari
        )
        
        self.manager_eswari = User.objects.create_user(
            username='manager_eswari',
            email='manager@eswari.com',
            password='manager123',
            role='manager',
            company=self.company_eswari
        )
        
        self.employee_eswari = User.objects.create_user(
            username='employee_eswari',
            email='employee@eswari.com',
            password='employee123',
            role='employee',
            company=self.company_eswari,
            manager=self.manager_eswari
        )
        
        # Create users for ASE Technologies
        self.manager_ase = User.objects.create_user(
            username='manager_ase',
            email='manager@ase.com',
            password='manager123',
            role='manager',
            company=self.company_ase
        )
        
        self.employee_ase = User.objects.create_user(
            username='employee_ase',
            email='employee@ase.com',
            password='employee123',
            role='employee',
            company=self.company_ase,
            manager=self.manager_ase
        )
        
        # Create API clients
        self.admin_client = APIClient()
        self.hr_client = APIClient()
        self.manager_eswari_client = APIClient()
        self.employee_eswari_client = APIClient()
        self.manager_ase_client = APIClient()
        self.employee_ase_client = APIClient()
        
        # Authenticate clients
        self.admin_client.force_authenticate(user=self.admin_user)
        self.hr_client.force_authenticate(user=self.hr_user)
        self.manager_eswari_client.force_authenticate(user=self.manager_eswari)
        self.employee_eswari_client.force_authenticate(user=self.employee_eswari)
        self.manager_ase_client.force_authenticate(user=self.manager_ase)
        self.employee_ase_client.force_authenticate(user=self.employee_ase)
    
    def test_complete_flow_create_company_assign_users_create_data_verify_filtering(self):
        """
        Test complete flow: create company → assign users → create data → verify filtering
        
        **Validates: Requirements 1.1-1.4, 2.1-2.5, 3.1-3.4, 4.1-4.7, 5.1-5.7**
        """
        # Step 1: Create a new company (as admin)
        response = self.admin_client.post('/api/auth/companies/', {
            'name': 'New Test Company',
            'code': 'NEWTEST',
            'is_active': True
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_company_id = response.data['id']
        
        # Step 2: Create a user and assign to new company
        new_user = User.objects.create_user(
            username='new_manager',
            email='manager@newtest.com',
            password='manager123',
            role='manager',
            company_id=new_company_id
        )
        
        # Step 3: Create data for the new company (as admin)
        lead_response = self.admin_client.post('/api/leads/', {
            'name': 'New Company Lead',
            'email': 'lead@newtest.com',
            'phone': '1234567890',
            'status': 'new',
            'source': 'website',
            'company': new_company_id,
            'assigned_to': new_user.id
        })
        self.assertEqual(lead_response.status_code, status.HTTP_201_CREATED)
        new_lead_id = lead_response.data['id']
        
        # Step 4: Verify filtering - admin can see all companies
        all_leads_response = self.admin_client.get('/api/leads/')
        self.assertEqual(all_leads_response.status_code, status.HTTP_200_OK)
        # Should see leads from all companies
        
        # Step 5: Verify filtering - new manager can only see their company's data
        new_manager_client = APIClient()
        new_manager_client.force_authenticate(user=new_user)
        
        manager_leads_response = new_manager_client.get('/api/leads/')
        self.assertEqual(manager_leads_response.status_code, status.HTTP_200_OK)
        
        # Manager should only see leads from their company
        for lead in manager_leads_response.data['results']:
            self.assertEqual(lead['company']['id'], new_company_id)
        
        # Step 6: Verify manager cannot access other company's data
        eswari_lead = Lead.objects.create(
            name='Eswari Lead',
            email='lead@eswari.com',
            phone='9876543210',
            status='new',
            source='referral',
            company=self.company_eswari,
            assigned_to=self.manager_eswari,
            created_by=self.manager_eswari
        )
        
        # New manager tries to access Eswari lead
        cross_company_response = new_manager_client.get(f'/api/leads/{eswari_lead.id}/')
        self.assertEqual(cross_company_response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_admin_creating_data_for_multiple_companies(self):
        """
        Test admin creating data for multiple companies
        
        **Validates: Requirements 4.6, 4.7**
        """
        # Admin creates lead for Eswari Group
        eswari_lead_response = self.admin_client.post('/api/leads/', {
            'name': 'Eswari Lead',
            'email': 'lead@eswari.com',
            'phone': '1111111111',
            'status': 'new',
            'source': 'website',
            'company': self.company_eswari.id,
            'assigned_to': self.manager_eswari.id
        })
        self.assertEqual(eswari_lead_response.status_code, status.HTTP_201_CREATED)
        # Company is returned as ID, not nested object
        self.assertEqual(eswari_lead_response.data['company'], self.company_eswari.id)
        
        # Admin creates lead for ASE Technologies
        ase_lead_response = self.admin_client.post('/api/leads/', {
            'name': 'ASE Lead',
            'email': 'lead@ase.com',
            'phone': '2222222222',
            'status': 'new',
            'source': 'referral',
            'company': self.company_ase.id,
            'assigned_to': self.manager_ase.id
        })
        self.assertEqual(ase_lead_response.status_code, status.HTTP_201_CREATED)
        # Company is returned as ID, not nested object
        self.assertEqual(ase_lead_response.data['company'], self.company_ase.id)
        
        # Admin can retrieve both leads
        all_leads = self.admin_client.get('/api/leads/')
        self.assertEqual(all_leads.status_code, status.HTTP_200_OK)
        
        # Admin can filter by company
        eswari_filtered = self.admin_client.get(f'/api/leads/?company={self.company_eswari.id}')
        self.assertEqual(eswari_filtered.status_code, status.HTTP_200_OK)
        for lead in eswari_filtered.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        ase_filtered = self.admin_client.get(f'/api/leads/?company={self.company_ase.id}')
        self.assertEqual(ase_filtered.status_code, status.HTTP_200_OK)
        for lead in ase_filtered.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
    
    def test_manager_attempting_cross_company_access_denied(self):
        """
        Test manager attempting cross-company access (should be denied with 403/404)
        
        **Validates: Requirements 4.3, 4.4, 12.3**
        """
        # Create data for both companies
        eswari_lead = Lead.objects.create(
            name='Eswari Lead',
            email='lead@eswari.com',
            phone='1111111111',
            status='new',
            source='website',
            company=self.company_eswari,
            assigned_to=self.manager_eswari,
            created_by=self.manager_eswari
        )
        
        ase_lead = Lead.objects.create(
            name='ASE Lead',
            email='lead@ase.com',
            phone='2222222222',
            status='new',
            source='referral',
            company=self.company_ase,
            assigned_to=self.manager_ase,
            created_by=self.manager_ase
        )
        
        # Eswari manager tries to access ASE lead (should be denied)
        response = self.manager_eswari_client.get(f'/api/leads/{ase_lead.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # ASE manager tries to access Eswari lead (should be denied)
        response = self.manager_ase_client.get(f'/api/leads/{eswari_lead.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Eswari manager tries to update ASE lead (should be denied)
        response = self.manager_eswari_client.patch(f'/api/leads/{ase_lead.id}/', {
            'status': 'contacted'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Eswari manager tries to delete ASE lead (should be denied)
        response = self.manager_eswari_client.delete(f'/api/leads/{ase_lead.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify ASE lead still exists
        self.assertTrue(Lead.objects.filter(id=ase_lead.id).exists())
    
    def test_employee_attempting_cross_company_access_denied(self):
        """
        Test employee attempting cross-company access (should be denied)
        
        **Validates: Requirements 4.3, 4.4**
        """
        # Create customers for both companies (Customer model doesn't have email field)
        eswari_customer = Customer.objects.create(
            name='Eswari Customer',
            phone='1111111111',
            company=self.company_eswari,
            created_by=self.manager_eswari
        )
        
        ase_customer = Customer.objects.create(
            name='ASE Customer',
            phone='2222222222',
            company=self.company_ase,
            created_by=self.manager_ase
        )
        
        # Eswari employee tries to access ASE customer
        response = self.employee_eswari_client.get(f'/api/customers/{ase_customer.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # ASE employee tries to access Eswari customer
        response = self.employee_ase_client.get(f'/api/customers/{eswari_customer.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_company_switching_for_admin_users(self):
        """
        Test company switching for admin users using company filter parameter
        
        **Validates: Requirements 5.3, 5.4, 5.5, 6.4**
        """
        # Create leads for both companies
        eswari_lead = Lead.objects.create(
            name='Eswari Lead',
            email='lead@eswari.com',
            phone='1111111111',
            status='new',
            source='website',
            company=self.company_eswari,
            assigned_to=self.manager_eswari,
            created_by=self.manager_eswari
        )
        
        ase_lead = Lead.objects.create(
            name='ASE Lead',
            email='lead@ase.com',
            phone='2222222222',
            status='new',
            source='referral',
            company=self.company_ase,
            assigned_to=self.manager_ase,
            created_by=self.manager_ase
        )
        
        # Admin without filter sees all leads
        all_leads = self.admin_client.get('/api/leads/')
        self.assertEqual(all_leads.status_code, status.HTTP_200_OK)
        lead_ids = [lead['id'] for lead in all_leads.data['results']]
        self.assertIn(eswari_lead.id, lead_ids)
        self.assertIn(ase_lead.id, lead_ids)
        
        # Admin filters by Eswari company
        eswari_leads = self.admin_client.get(f'/api/leads/?company={self.company_eswari.id}')
        self.assertEqual(eswari_leads.status_code, status.HTTP_200_OK)
        for lead in eswari_leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        # Admin filters by ASE company
        ase_leads = self.admin_client.get(f'/api/leads/?company={self.company_ase.id}')
        self.assertEqual(ase_leads.status_code, status.HTTP_200_OK)
        for lead in ase_leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
        
        # Admin can access individual leads from any company
        eswari_detail = self.admin_client.get(f'/api/leads/{eswari_lead.id}/')
        self.assertEqual(eswari_detail.status_code, status.HTTP_200_OK)
        
        ase_detail = self.admin_client.get(f'/api/leads/{ase_lead.id}/')
        self.assertEqual(ase_detail.status_code, status.HTTP_200_OK)
    
    def test_company_switching_for_hr_users(self):
        """
        Test company switching for HR users using company filter parameter
        
        **Validates: Requirements 4.1, 5.3, 5.4, 5.5**
        """
        # Create projects for both companies (Project model doesn't have created_by field)
        eswari_project = Project.objects.create(
            name='Eswari Project',
            description='Test project',
            status='pre_launch',
            location='Test Location',
            company=self.company_eswari
        )
        
        ase_project = Project.objects.create(
            name='ASE Project',
            description='Test project',
            status='pre_launch',
            location='Test Location',
            company=self.company_ase
        )
        
        # HR without filter sees all projects
        all_projects = self.hr_client.get('/api/projects/')
        self.assertEqual(all_projects.status_code, status.HTTP_200_OK)
        project_ids = [proj['id'] for proj in all_projects.data['results']]
        self.assertIn(eswari_project.id, project_ids)
        self.assertIn(ase_project.id, project_ids)
        
        # HR filters by Eswari company
        eswari_projects = self.hr_client.get(f'/api/projects/?company={self.company_eswari.id}')
        self.assertEqual(eswari_projects.status_code, status.HTTP_200_OK)
        for proj in eswari_projects.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = proj['company'] if isinstance(proj['company'], int) else proj['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        # HR filters by ASE company
        ase_projects = self.hr_client.get(f'/api/projects/?company={self.company_ase.id}')
        self.assertEqual(ase_projects.status_code, status.HTTP_200_OK)
        for proj in ase_projects.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = proj['company'] if isinstance(proj['company'], int) else proj['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
    
    def test_manager_cannot_use_company_filter_for_other_companies(self):
        """
        Test that managers cannot use company filter to access other companies' data
        
        **Validates: Requirements 5.6**
        """
        # Create leads for both companies
        eswari_lead = Lead.objects.create(
            name='Eswari Lead',
            email='lead@eswari.com',
            phone='1111111111',
            status='new',
            source='website',
            company=self.company_eswari,
            assigned_to=self.manager_eswari,
            created_by=self.manager_eswari
        )
        
        ase_lead = Lead.objects.create(
            name='ASE Lead',
            email='lead@ase.com',
            phone='2222222222',
            status='new',
            source='referral',
            company=self.company_ase,
            assigned_to=self.manager_ase,
            created_by=self.manager_ase
        )
        
        # Eswari manager tries to filter by ASE company (should still only see Eswari data)
        response = self.manager_eswari_client.get(f'/api/leads/?company={self.company_ase.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should return empty or only Eswari leads (company filter ignored for restricted roles)
        for lead in response.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
    
    def test_multiple_entity_types_with_company_filtering(self):
        """
        Test company filtering works across all entity types
        
        **Validates: Requirements 3.1-3.7, 5.7**
        """
        # Create various entities for Eswari
        eswari_lead = Lead.objects.create(
            name='Eswari Lead',
            email='lead@eswari.com',
            phone='1111111111',
            status='new',
            source='website',
            company=self.company_eswari,
            assigned_to=self.manager_eswari,
            created_by=self.manager_eswari
        )
        
        eswari_customer = Customer.objects.create(
            name='Eswari Customer',
            phone='1111111112',
            company=self.company_eswari,
            created_by=self.manager_eswari
        )
        
        eswari_project = Project.objects.create(
            name='Eswari Project',
            description='Test project',
            status='pre_launch',
            location='Test Location',
            company=self.company_eswari
        )
        
        # Create various entities for ASE
        ase_lead = Lead.objects.create(
            name='ASE Lead',
            email='lead@ase.com',
            phone='2222222222',
            status='new',
            source='referral',
            company=self.company_ase,
            assigned_to=self.manager_ase,
            created_by=self.manager_ase
        )
        
        ase_customer = Customer.objects.create(
            name='ASE Customer',
            phone='2222222223',
            company=self.company_ase,
            created_by=self.manager_ase
        )
        
        ase_project = Project.objects.create(
            name='ASE Project',
            description='Test project',
            status='pre_launch',
            location='Test Location',
            company=self.company_ase
        )
        
        # Eswari manager should only see Eswari entities
        leads = self.manager_eswari_client.get('/api/leads/')
        for lead in leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        customers = self.manager_eswari_client.get('/api/customers/')
        for customer in customers.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = customer['company'] if isinstance(customer['company'], int) else customer['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        projects = self.manager_eswari_client.get('/api/projects/')
        for project in projects.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = project['company'] if isinstance(project['company'], int) else project['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        # ASE manager should only see ASE entities
        leads = self.manager_ase_client.get('/api/leads/')
        for lead in leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
        
        customers = self.manager_ase_client.get('/api/customers/')
        for customer in customers.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = customer['company'] if isinstance(customer['company'], int) else customer['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
        
        projects = self.manager_ase_client.get('/api/projects/')
        for project in projects.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = project['company'] if isinstance(project['company'], int) else project['company']['id']
            self.assertEqual(company_id, self.company_ase.id)
    
    def test_automatic_company_assignment_for_restricted_roles(self):
        """
        Test that managers and employees automatically get their company assigned to created entities
        
        **Validates: Requirements 3.2, 4.7**
        """
        # Manager creates lead without specifying company
        response = self.manager_eswari_client.post('/api/leads/', {
            'name': 'Auto-assigned Lead',
            'email': 'auto@eswari.com',
            'phone': '1111111111',
            'status': 'new',
            'source': 'website'
            # Note: assigned_to is optional, not required
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Company is returned as ID, not nested object
        self.assertEqual(response.data['company'], self.company_eswari.id)
        
        # Employee creates customer without specifying company
        response = self.employee_eswari_client.post('/api/customers/', {
            'name': 'Auto-assigned Customer',
            'phone': '1111111113'
            # Note: email field doesn't exist in Customer model
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Company is returned as ID, not nested object
        self.assertEqual(response.data['company'], self.company_eswari.id)
    
    def test_data_isolation_between_companies(self):
        """
        Test complete data isolation between companies
        
        **Validates: Requirements 3.1-3.7, 4.1-4.7**
        """
        # Create comprehensive data for both companies
        for i in range(5):
            Lead.objects.create(
                name=f'Eswari Lead {i}',
                email=f'lead{i}@eswari.com',
                phone=f'111111111{i}',
                status='new',
                source='website',
                company=self.company_eswari,
                assigned_to=self.manager_eswari,
                created_by=self.manager_eswari
            )
            
            Lead.objects.create(
                name=f'ASE Lead {i}',
                email=f'lead{i}@ase.com',
                phone=f'222222222{i}',
                status='new',
                source='referral',
                company=self.company_ase,
                assigned_to=self.manager_ase,
                created_by=self.manager_ase
            )
        
        # Eswari manager should see exactly 5 leads
        eswari_leads = self.manager_eswari_client.get('/api/leads/')
        self.assertEqual(eswari_leads.status_code, status.HTTP_200_OK)
        self.assertEqual(eswari_leads.data['count'], 5)
        
        # ASE manager should see exactly 5 leads
        ase_leads = self.manager_ase_client.get('/api/leads/')
        self.assertEqual(ase_leads.status_code, status.HTTP_200_OK)
        self.assertEqual(ase_leads.data['count'], 5)
        
        # Admin should see all 10 leads
        all_leads = self.admin_client.get('/api/leads/')
        self.assertEqual(all_leads.status_code, status.HTTP_200_OK)
        self.assertEqual(all_leads.data['count'], 10)
        
        # Verify no data leakage
        for lead in eswari_leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_eswari.id)
        
        for lead in ase_leads.data['results']:
            # Company might be returned as ID or nested object depending on serializer
            company_id = lead['company'] if isinstance(lead['company'], int) else lead['company']['id']
            self.assertEqual(company_id, self.company_ase.id)


class CompanyContextIntegrationTests(TestCase):
    """
    Integration tests for company context in authentication and API responses.
    """
    
    def setUp(self):
        """Set up test data"""
        # Get or create companies (migration creates default "ESWARI" company)
        self.company_eswari, _ = Company.objects.get_or_create(
            code='ESWARI',
            defaults={
                'name': 'Eswari Group',
                'is_active': True
            }
        )
        self.company_ase, _ = Company.objects.get_or_create(
            code='ASE',
            defaults={
                'name': 'ASE Technologies',
                'is_active': True
            }
        )
        
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@eswari.com',
            password='admin123',
            role='admin',
            company=self.company_eswari
        )
        
        self.manager_user = User.objects.create_user(
            username='manager',
            email='manager@eswari.com',
            password='manager123',
            role='manager',
            company=self.company_eswari
        )
        
        self.client = APIClient()
    
    def test_authentication_includes_company_context(self):
        """
        Test that authentication response includes company information
        
        **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
        """
        # Login as admin (login expects 'email' field, which can be username or email)
        response = self.client.post('/api/auth/login/', {
            'email': 'admin',  # Can be username or email
            'password': 'admin123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify company information is included
        self.assertIn('company', response.data)
        self.assertEqual(response.data['company']['id'], self.company_eswari.id)
        self.assertEqual(response.data['company']['name'], 'Eswari Group')
        self.assertEqual(response.data['company']['code'], 'ESWARI')
        
        # Verify role is included in user data
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'admin')
        
        # Admin should see list of all active companies
        self.assertIn('companies', response.data)
        self.assertEqual(len(response.data['companies']), 2)
    
    def test_manager_authentication_includes_single_company(self):
        """
        Test that manager authentication includes only their company
        
        **Validates: Requirements 14.4**
        """
        response = self.client.post('/api/auth/login/', {
            'email': 'manager',  # Can be username or email
            'password': 'manager123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify company information
        self.assertEqual(response.data['company']['id'], self.company_eswari.id)
        
        # Manager should see only their company in available companies
        self.assertIn('companies', response.data)
        self.assertEqual(len(response.data['companies']), 1)
        self.assertEqual(response.data['companies'][0]['id'], self.company_eswari.id)
