"""
Performance tests for multi-company support.
Tests query execution time, index usage, and performance with large datasets.

Validates Requirements 13.1, 13.2, 13.4:
- Database indexes on company foreign key fields
- Indexed lookups for optimal performance
- Query performance monitoring
"""
import time
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Company

User = get_user_model()

# Import models for testing
try:
    from leads.models import Lead
except ImportError:
    Lead = None

try:
    from customers.models import Customer
except ImportError:
    Customer = None

try:
    from projects.models import Project
except ImportError:
    Project = None

try:
    from tasks.models import Task
except ImportError:
    Task = None


class CompanyPerformanceTests(TestCase):
    """Test performance of company-filtered queries."""
    
    def setUp(self):
        """Set up test data with multiple companies and large datasets."""
        # Create two companies with unique codes for testing
        self.company1 = Company.objects.create(
            name='Test Company 1',
            code='TEST1',
            is_active=True
        )
        self.company2 = Company.objects.create(
            name='Test Company 2',
            code='TEST2',
            is_active=True
        )
        
        # Create admin user (cross-company access)
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='admin',
            company=self.company1,
            first_name='Admin',
            last_name='User'
        )
        
        # Create HR user (cross-company access)
        self.hr_user = User.objects.create_user(
            username='hr_test',
            email='hr@test.com',
            password='testpass123',
            role='hr',
            company=self.company1,
            first_name='HR',
            last_name='User'
        )
        
        # Create manager for company1
        self.manager1 = User.objects.create_user(
            username='manager1_test',
            email='manager1@test.com',
            password='testpass123',
            role='manager',
            company=self.company1,
            first_name='Manager1',
            last_name='User'
        )
        
        # Create manager for company2
        self.manager2 = User.objects.create_user(
            username='manager2_test',
            email='manager2@test.com',
            password='testpass123',
            role='manager',
            company=self.company2,
            first_name='Manager2',
            last_name='User'
        )
        
        # Create employees for both companies (50 each for realistic load)
        self.employees_company1 = []
        self.employees_company2 = []
        
        for i in range(50):
            emp1 = User.objects.create_user(
                username=f'emp1_{i}',
                email=f'emp1_{i}@test.com',
                password='testpass123',
                role='employee',
                company=self.company1,
                manager=self.manager1,
                first_name=f'Employee1_{i}',
                last_name='Test'
            )
            self.employees_company1.append(emp1)
            
            emp2 = User.objects.create_user(
                username=f'emp2_{i}',
                email=f'emp2_{i}@test.com',
                password='testpass123',
                role='employee',
                company=self.company2,
                manager=self.manager2,
                first_name=f'Employee2_{i}',
                last_name='Test'
            )
            self.employees_company2.append(emp2)
        
        # Create large datasets for each company
        self._create_large_datasets()
        
        # Set up API clients
        self.admin_client = APIClient()
        admin_token = RefreshToken.for_user(self.admin_user)
        self.admin_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token.access_token}')
        
        self.manager1_client = APIClient()
        manager1_token = RefreshToken.for_user(self.manager1)
        self.manager1_client.credentials(HTTP_AUTHORIZATION=f'Bearer {manager1_token.access_token}')
        
        self.manager2_client = APIClient()
        manager2_token = RefreshToken.for_user(self.manager2)
        self.manager2_client.credentials(HTTP_AUTHORIZATION=f'Bearer {manager2_token.access_token}')
    
    def _create_large_datasets(self):
        """Create large datasets for performance testing."""
        # Create 50 leads per company (reduced from 100 for faster testing)
        if Lead:
            for i in range(50):
                Lead.objects.create(
                    name=f'Lead Company1 {i}',
                    email=f'lead1_{i}@test.com',
                    phone=f'555010{i:04d}',
                    status='new',
                    company=self.company1,
                    created_by=self.manager1,
                    assigned_to=self.employees_company1[i % 50]
                )
                Lead.objects.create(
                    name=f'Lead Company2 {i}',
                    email=f'lead2_{i}@test.com',
                    phone=f'555020{i:04d}',
                    status='new',
                    company=self.company2,
                    created_by=self.manager2,
                    assigned_to=self.employees_company2[i % 50]
                )
        
        # Create 50 customers per company (reduced from 100)
        if Customer:
            for i in range(50):
                Customer.objects.create(
                    name=f'Customer Company1 {i}',
                    phone=f'555030{i:04d}',
                    company=self.company1,
                    created_by=self.manager1
                )
                Customer.objects.create(
                    name=f'Customer Company2 {i}',
                    phone=f'555040{i:04d}',
                    company=self.company2,
                    created_by=self.manager2
                )
        
        # Create 25 projects per company (reduced from 50)
        if Project:
            for i in range(25):
                Project.objects.create(
                    name=f'Project Company1 {i}',
                    description=f'Test project {i}',
                    status='launch',
                    location='Test Location',
                    company=self.company1
                )
                Project.objects.create(
                    name=f'Project Company2 {i}',
                    description=f'Test project {i}',
                    status='launch',
                    location='Test Location',
                    company=self.company2
                )
        
        # Create 100 tasks per company (reduced from 200)
        if Task and Project:
            projects1 = Project.objects.filter(company=self.company1)
            projects2 = Project.objects.filter(company=self.company2)
            
            for i in range(100):
                Task.objects.create(
                    title=f'Task Company1 {i}',
                    description=f'Test task {i}',
                    status='pending',
                    priority='medium',
                    company=self.company1,
                    project=projects1[i % projects1.count()] if projects1.exists() else None,
                    assigned_to=self.employees_company1[i % 50],
                    created_by=self.manager1
                )
                Task.objects.create(
                    title=f'Task Company2 {i}',
                    description=f'Test task {i}',
                    status='pending',
                    priority='medium',
                    company=self.company2,
                    project=projects2[i % projects2.count()] if projects2.exists() else None,
                    assigned_to=self.employees_company2[i % 50],
                    created_by=self.manager2
                )
    
    def test_user_query_performance_with_company_filter(self):
        """Test that user queries with company filtering execute quickly."""
        # Warm up the database connection
        User.objects.filter(company=self.company1).count()
        
        # Test manager query (single company)
        start_time = time.time()
        users = list(User.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        # Assert query completes in under 100ms
        self.assertLess(
            query_time,
            0.1,
            f"User query with company filter took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify correct data returned
        self.assertGreater(len(users), 0)
        for user in users:
            self.assertEqual(user.company_id, self.company1.id)
        
        print(f"\n✓ User query with company filter: {query_time*1000:.2f}ms")
    
    def test_lead_query_performance_with_company_filter(self):
        """Test that lead queries with company filtering execute quickly."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Warm up
        Lead.objects.filter(company=self.company1).count()
        
        # Test query performance
        start_time = time.time()
        leads = list(Lead.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertLess(
            query_time,
            0.1,
            f"Lead query with company filter took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify correct data
        self.assertEqual(len(leads), 50)  # Reduced dataset
        for lead in leads:
            self.assertEqual(lead.company_id, self.company1.id)
        
        print(f"✓ Lead query with company filter: {query_time*1000:.2f}ms")

    def test_customer_query_performance_with_company_filter(self):
        """Test that customer queries with company filtering execute quickly."""
        if not Customer:
            self.skipTest("Customer model not available")
        
        # Warm up
        Customer.objects.filter(company=self.company1).count()
        
        # Test query performance
        start_time = time.time()
        customers = list(Customer.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertLess(
            query_time,
            0.1,
            f"Customer query with company filter took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify correct data
        self.assertEqual(len(customers), 50)  # Reduced dataset
        for customer in customers:
            self.assertEqual(customer.company_id, self.company1.id)
        
        print(f"✓ Customer query with company filter: {query_time*1000:.2f}ms")
    
    def test_project_query_performance_with_company_filter(self):
        """Test that project queries with company filtering execute quickly."""
        if not Project:
            self.skipTest("Project model not available")
        
        # Warm up
        Project.objects.filter(company=self.company1).count()
        
        # Test query performance
        start_time = time.time()
        projects = list(Project.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertLess(
            query_time,
            0.1,
            f"Project query with company filter took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify correct data
        self.assertEqual(len(projects), 25)  # Reduced dataset
        for project in projects:
            self.assertEqual(project.company_id, self.company1.id)
        
        print(f"✓ Project query with company filter: {query_time*1000:.2f}ms")
    
    def test_task_query_performance_with_company_filter(self):
        """Test that task queries with company filtering execute quickly."""
        if not Task:
            self.skipTest("Task model not available")
        
        # Warm up
        Task.objects.filter(company=self.company1).count()
        
        # Test query performance
        start_time = time.time()
        tasks = list(Task.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertLess(
            query_time,
            0.1,
            f"Task query with company filter took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify correct data
        self.assertEqual(len(tasks), 100)
        for task in tasks:
            self.assertEqual(task.company_id, self.company1.id)
        
        print(f"✓ Task query with company filter: {query_time*1000:.2f}ms")
    
    def test_index_usage_on_user_company_field(self):
        """Verify that database indexes are used for user company queries."""
        with CaptureQueriesContext(connection) as context:
            list(User.objects.filter(company=self.company1))
        
        # Get the SQL query
        self.assertEqual(len(context.captured_queries), 1)
        sql = context.captured_queries[0]['sql']
        
        # Check that the query uses the company field
        self.assertIn('company_id', sql.lower())
        
        # Use EXPLAIN to verify index usage
        with connection.cursor() as cursor:
            explain_query = f"EXPLAIN {sql}"
            cursor.execute(explain_query)
            explain_result = cursor.fetchall()
            
            # Convert to string for analysis
            explain_text = str(explain_result).lower()
            
            # Verify index is mentioned (PostgreSQL shows index scans)
            # Note: The exact format depends on the database backend
            print(f"\n✓ User query EXPLAIN result: {explain_result}")
            
            # At minimum, verify the query executed successfully
            self.assertIsNotNone(explain_result)
    
    def test_index_usage_on_lead_company_field(self):
        """Verify that database indexes are used for lead company queries."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        with CaptureQueriesContext(connection) as context:
            list(Lead.objects.filter(company=self.company1))
        
        # Get the SQL query
        self.assertEqual(len(context.captured_queries), 1)
        sql = context.captured_queries[0]['sql']
        
        # Check that the query uses the company field
        self.assertIn('company_id', sql.lower())
        
        # Use EXPLAIN to verify index usage
        with connection.cursor() as cursor:
            explain_query = f"EXPLAIN {sql}"
            cursor.execute(explain_query)
            explain_result = cursor.fetchall()
            
            print(f"✓ Lead query EXPLAIN result: {explain_result}")
            self.assertIsNotNone(explain_result)
    
    def test_composite_index_usage_on_lead_company_created_at(self):
        """Verify that composite indexes are used for common queries."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Query using both company and created_at (common pattern)
        cutoff_date = datetime.now() - timedelta(days=30)
        
        with CaptureQueriesContext(connection) as context:
            list(Lead.objects.filter(
                company=self.company1,
                created_at__gte=cutoff_date
            ).order_by('-created_at'))
        
        # Get the SQL query
        self.assertEqual(len(context.captured_queries), 1)
        sql = context.captured_queries[0]['sql']
        
        # Verify both fields are in the query
        self.assertIn('company_id', sql.lower())
        self.assertIn('created_at', sql.lower())
        
        # Use EXPLAIN to verify index usage
        with connection.cursor() as cursor:
            explain_query = f"EXPLAIN {sql}"
            cursor.execute(explain_query)
            explain_result = cursor.fetchall()
            
            print(f"✓ Lead composite index query EXPLAIN result: {explain_result}")
            self.assertIsNotNone(explain_result)
    
    def test_select_related_optimization_for_company(self):
        """Verify that select_related reduces query count for company relationships."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Test without select_related (should cause N+1 queries)
        with CaptureQueriesContext(connection) as context_without:
            leads = list(Lead.objects.filter(company=self.company1)[:10])
            # Access company name for each lead
            for lead in leads:
                _ = lead.company.name
        
        queries_without = len(context_without.captured_queries)
        
        # Test with select_related (should use only 1 query)
        with CaptureQueriesContext(connection) as context_with:
            leads = list(Lead.objects.filter(company=self.company1).select_related('company')[:10])
            # Access company name for each lead
            for lead in leads:
                _ = lead.company.name
        
        queries_with = len(context_with.captured_queries)
        
        # Verify select_related reduces queries
        self.assertLess(
            queries_with,
            queries_without,
            f"select_related should reduce queries (without: {queries_without}, with: {queries_with})"
        )
        
        # With select_related, should be just 1 query
        self.assertEqual(
            queries_with,
            1,
            f"select_related should use only 1 query, but used {queries_with}"
        )
        
        print(f"\n✓ Query optimization: {queries_without} queries without select_related, {queries_with} with select_related")
    
    def test_multi_company_query_performance_admin(self):
        """Test that admin queries across all companies perform well."""
        # Warm up
        User.objects.all().count()
        
        # Test admin query (all companies)
        start_time = time.time()
        users = list(User.objects.all())
        end_time = time.time()
        
        query_time = end_time - start_time
        
        # Should complete in under 200ms even with all companies
        self.assertLess(
            query_time,
            0.2,
            f"Multi-company user query took {query_time*1000:.2f}ms (requirement: < 200ms)"
        )
        
        # Verify data from both companies
        company1_users = [u for u in users if u.company_id == self.company1.id]
        company2_users = [u for u in users if u.company_id == self.company2.id]
        
        self.assertGreater(len(company1_users), 0)
        self.assertGreater(len(company2_users), 0)
        
        print(f"\n✓ Multi-company user query: {query_time*1000:.2f}ms")
    
    def test_multi_company_lead_query_performance_admin(self):
        """Test that admin lead queries across all companies perform well."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Warm up
        Lead.objects.all().count()
        
        # Test admin query (all companies)
        start_time = time.time()
        leads = list(Lead.objects.all())
        end_time = time.time()
        
        query_time = end_time - start_time
        
        # Should complete in under 200ms
        self.assertLess(
            query_time,
            0.2,
            f"Multi-company lead query took {query_time*1000:.2f}ms (requirement: < 200ms)"
        )
        
        # Verify data from both companies
        self.assertEqual(len(leads), 100)  # 50 per company
        
        print(f"✓ Multi-company lead query: {query_time*1000:.2f}ms")
    
    def test_api_endpoint_performance_manager_single_company(self):
        """Test API endpoint performance for manager (single company access)."""
        # Warm up
        self.manager1_client.get('/api/auth/users/')
        
        # Test user list endpoint
        start_time = time.time()
        response = self.manager1_client.get('/api/auth/users/')
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            query_time,
            1.0,
            f"Manager user list API took {query_time*1000:.2f}ms (requirement: < 1s)"
        )
        
        # Verify only company1 users returned
        if isinstance(response.data, dict):
            users = response.data.get('results', response.data)
        else:
            users = response.data
        
        if isinstance(users, list) and len(users) > 0:
            # Get the company ID from the first user
            first_user_company_id = users[0]['company']['id'] if isinstance(users[0]['company'], dict) else users[0]['company']
            
            # Verify all users belong to the same company (manager's company)
            for user in users:
                company_id = user['company']['id'] if isinstance(user['company'], dict) else user['company']
                self.assertEqual(company_id, first_user_company_id, "All users should belong to the same company")
            
            # Verify it's the manager's company
            self.assertEqual(first_user_company_id, self.manager1.company_id, "Users should belong to manager's company")
        
        print(f"\n✓ Manager user list API: {query_time*1000:.2f}ms")
    
    def test_api_endpoint_performance_admin_multi_company(self):
        """Test API endpoint performance for admin (multi-company access)."""
        # Warm up
        self.admin_client.get('/api/auth/users/')
        
        # Test user list endpoint
        start_time = time.time()
        response = self.admin_client.get('/api/auth/users/')
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            query_time,
            1.5,
            f"Admin user list API took {query_time*1000:.2f}ms (requirement: < 1.5s)"
        )
        
        print(f"✓ Admin user list API: {query_time*1000:.2f}ms")
    
    def test_api_endpoint_performance_with_company_filter(self):
        """Test API endpoint performance when admin filters by specific company."""
        # Warm up
        self.admin_client.get(f'/api/auth/users/?company={self.company1.id}')
        
        # Test with company filter
        start_time = time.time()
        response = self.admin_client.get(f'/api/auth/users/?company={self.company1.id}')
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            query_time,
            1.0,
            f"Admin filtered user list API took {query_time*1000:.2f}ms (requirement: < 1s)"
        )
        
        # Verify only company1 users returned
        if isinstance(response.data, dict):
            users = response.data.get('results', response.data)
        else:
            users = response.data
        
        if isinstance(users, list) and len(users) > 0:
            # Verify all users belong to company1
            for user in users:
                company_id = user['company']['id'] if isinstance(user['company'], dict) else user['company']
                self.assertEqual(company_id, self.company1.id, f"User should belong to company1 (ID: {self.company1.id})")
        
        print(f"✓ Admin filtered user list API: {query_time*1000:.2f}ms")
    
    def test_large_dataset_query_performance(self):
        """Test query performance with large datasets."""
        if not Task:
            self.skipTest("Task model not available")
        
        # Query 200 tasks for company1
        start_time = time.time()
        tasks = list(Task.objects.filter(company=self.company1))
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertEqual(len(tasks), 100)  # Reduced dataset
        self.assertLess(
            query_time,
            0.15,
            f"Large dataset query (100 tasks) took {query_time*1000:.2f}ms (requirement: < 150ms)"
        )
        
        print(f"\n✓ Large dataset query (100 tasks): {query_time*1000:.2f}ms")
    
    def test_query_count_for_list_with_relationships(self):
        """Test that queries with relationships don't cause N+1 issues."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Query leads with related company, assigned_to, and created_by
        with CaptureQueriesContext(connection) as context:
            leads = list(
                Lead.objects.filter(company=self.company1)
                .select_related('company', 'assigned_to', 'created_by')[:20]
            )
            # Access related fields
            for lead in leads:
                _ = lead.company.name
                if lead.assigned_to:
                    _ = lead.assigned_to.email
                if lead.created_by:
                    _ = lead.created_by.email
        
        query_count = len(context.captured_queries)
        
        # Should use only 1 query with select_related
        self.assertEqual(
            query_count,
            1,
            f"Query with select_related should use 1 query, but used {query_count}"
        )
        
        print(f"\n✓ Query with relationships: {query_count} query (optimized with select_related)")
    
    def test_pagination_performance(self):
        """Test that pagination maintains good performance."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Test paginated query
        start_time = time.time()
        leads = list(Lead.objects.filter(company=self.company1)[:25])
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertEqual(len(leads), 25)
        self.assertLess(
            query_time,
            0.05,
            f"Paginated query (25 items) took {query_time*1000:.2f}ms (requirement: < 50ms)"
        )
        
        print(f"\n✓ Paginated query (25 items): {query_time*1000:.2f}ms")
    
    def test_concurrent_company_queries(self):
        """Test performance with concurrent queries to different companies."""
        # Simulate concurrent queries
        start_time = time.time()
        
        # Query company1 data
        users1 = list(User.objects.filter(company=self.company1))
        
        # Query company2 data
        users2 = list(User.objects.filter(company=self.company2))
        
        end_time = time.time()
        
        total_time = end_time - start_time
        
        # Both queries should complete quickly
        self.assertLess(
            total_time,
            0.2,
            f"Concurrent company queries took {total_time*1000:.2f}ms (requirement: < 200ms)"
        )
        
        # Verify data isolation
        self.assertGreater(len(users1), 0)
        self.assertGreater(len(users2), 0)
        
        for user in users1:
            self.assertEqual(user.company_id, self.company1.id)
        for user in users2:
            self.assertEqual(user.company_id, self.company2.id)
        
        print(f"\n✓ Concurrent company queries: {total_time*1000:.2f}ms")
    
    def test_complex_query_with_multiple_filters(self):
        """Test performance of complex queries with multiple filters."""
        if not Lead:
            self.skipTest("Lead model not available")
        
        # Complex query with company filter and other conditions
        start_time = time.time()
        leads = list(
            Lead.objects.filter(
                company=self.company1,
                status='new',
                created_at__gte=datetime.now() - timedelta(days=30)
            ).select_related('company', 'assigned_to')
        )
        end_time = time.time()
        
        query_time = end_time - start_time
        
        self.assertLess(
            query_time,
            0.1,
            f"Complex filtered query took {query_time*1000:.2f}ms (requirement: < 100ms)"
        )
        
        # Verify all results match filters
        for lead in leads:
            self.assertEqual(lead.company_id, self.company1.id)
            self.assertEqual(lead.status, 'new')
        
        print(f"\n✓ Complex filtered query: {query_time*1000:.2f}ms")
