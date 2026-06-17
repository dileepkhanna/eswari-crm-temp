#!/usr/bin/env python
"""
Smoke Test: ASE Technologies Data Isolation & Assignment
Tests the fixes for cross-company data leakage and assignment bugs.
"""
import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.test import force_authenticate
from accounts.models import Company, User
from ase_customers.models import ASECustomer
from ase_customers.views import ASECustomerViewSet
from ase_leads.models.lead import ASELead
from ase_leads.views import ASELeadViewSet

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class SmokeTest:
    def __init__(self):
        self.factory = RequestFactory()
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        
    def print_header(self, text):
        print(f"\n{BLUE}{'=' * 80}{RESET}")
        print(f"{BLUE}{text}{RESET}")
        print(f"{BLUE}{'=' * 80}{RESET}")
        
    def print_test(self, name):
        print(f"\n{YELLOW}TEST:{RESET} {name}")
        
    def assert_true(self, condition, message):
        if condition:
            print(f"  {GREEN}✓{RESET} {message}")
            self.passed += 1
            return True
        else:
            print(f"  {RED}✗{RESET} {message}")
            self.failed += 1
            return False
            
    def warn(self, message):
        print(f"  {YELLOW}⚠{RESET} {message}")
        self.warnings += 1
        
    def run_all(self):
        self.print_header("ASE Technologies Data Isolation Smoke Test")
        
        # Get test companies and users
        try:
            ase_company = Company.objects.get(code='ASE')
            other_companies = Company.objects.exclude(code='ASE')
            
            # Get ASE users
            ase_admin = User.objects.filter(company=ase_company, role='admin').first()
            ase_manager = User.objects.filter(company=ase_company, role='manager').first()
            ase_employee = User.objects.filter(company=ase_company, role='employee').first()
            
            # Get non-ASE user for cross-company test
            other_employee = None
            for company in other_companies:
                other_employee = User.objects.filter(company=company, role='employee').first()
                if other_employee:
                    break
            
            print(f"\n{BLUE}Test Environment:{RESET}")
            print(f"  ASE Company ID: {ase_company.id}")
            print(f"  ASE Admin: {ase_admin.username if ase_admin else 'NOT FOUND'}")
            print(f"  ASE Manager: {ase_manager.username if ase_manager else 'NOT FOUND'}")
            print(f"  ASE Employee: {ase_employee.username if ase_employee else 'NOT FOUND'}")
            print(f"  Other Company Employee: {other_employee.username if other_employee else 'NOT FOUND'}")
            
            # Run test suites
            self.test_customers_query_isolation(ase_company, ase_admin, ase_manager, ase_employee, other_employee)
            self.test_leads_query_isolation(ase_company, ase_admin, ase_manager, ase_employee)
            self.test_customer_creation_assignment(ase_company, ase_manager, ase_employee)
            self.test_lead_creation_assignment(ase_company, ase_manager, ase_employee)
            self.test_cross_company_isolation(ase_company, other_employee)
            
        except Company.DoesNotExist:
            print(f"{RED}ERROR: ASE Technologies company not found!{RESET}")
            return
        except Exception as e:
            print(f"{RED}ERROR: {e}{RESET}")
            import traceback
            traceback.print_exc()
            return
            
        # Print summary
        self.print_summary()
        
    def test_customers_query_isolation(self, ase_company, admin, manager, employee, other_employee):
        self.print_header("TEST SUITE 1: ASE Customers Query Isolation")
        
        # Test 1: Admin without company param should return only ASE data
        self.print_test("Admin query without ?company= param")
        if admin:
            request = self.factory.get('/api/ase/customers/')
            force_authenticate(request, user=admin)
            view = ASECustomerViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                companies = set(c.get('company') for c in results if c.get('company'))
                
                self.assert_true(
                    len(companies) <= 1 and (not companies or ase_company.id in companies),
                    f"Admin sees only ASE company data (companies: {companies})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No ASE admin found - skipping test")
            
        # Test 2: Manager sees only their company
        self.print_test("Manager query returns only ASE customers")
        if manager:
            request = self.factory.get('/api/ase/customers/')
            force_authenticate(request, user=manager)
            view = ASECustomerViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                wrong_company = [c for c in results if c.get('company') != ase_company.id]
                
                self.assert_true(
                    len(wrong_company) == 0,
                    f"Manager sees 0 customers from other companies (found {len(wrong_company)})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No ASE manager found - skipping test")
            
        # Test 3: Employee sees only their company
        self.print_test("Employee query returns only ASE customers")
        if employee:
            request = self.factory.get('/api/ase/customers/')
            force_authenticate(request, user=employee)
            view = ASECustomerViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                wrong_company = [c for c in results if c.get('company') != ase_company.id]
                
                self.assert_true(
                    len(wrong_company) == 0,
                    f"Employee sees 0 customers from other companies (found {len(wrong_company)})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No ASE employee found - skipping test")
            
    def test_leads_query_isolation(self, ase_company, admin, manager, employee):
        self.print_header("TEST SUITE 2: ASE Leads Query Isolation")
        
        # Test 1: Admin query
        self.print_test("Admin query without ?company= param")
        if admin:
            request = self.factory.get('/api/ase/leads/')
            force_authenticate(request, user=admin)
            view = ASELeadViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                companies = set(l.get('company') for l in results if l.get('company'))
                
                self.assert_true(
                    len(companies) <= 1 and (not companies or ase_company.id in companies),
                    f"Admin sees only ASE company leads (companies: {companies})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No ASE admin found - skipping test")
            
        # Test 2: Manager sees only their company
        self.print_test("Manager query returns only ASE leads")
        if manager:
            request = self.factory.get('/api/ase/leads/')
            force_authenticate(request, user=manager)
            view = ASELeadViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                wrong_company = [l for l in results if l.get('company') != ase_company.id]
                
                self.assert_true(
                    len(wrong_company) == 0,
                    f"Manager sees 0 leads from other companies (found {len(wrong_company)})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No ASE manager found - skipping test")
            
    def test_customer_creation_assignment(self, ase_company, manager, employee):
        self.print_header("TEST SUITE 3: ASE Customer Creation & Assignment")
        
        # Test 1: Manager can assign to others
        self.print_test("Manager creates customer assigned to employee")
        if manager and employee:
            request = self.factory.post('/api/ase/customers/', {
                'name': 'Test Customer Manager',
                'phone': f'9999{datetime.now().strftime("%H%M%S")}',
                'company': ase_company.id,
                'assigned_to': employee.id,
                'call_status': 'pending'
            }, format='json')
            force_authenticate(request, user=manager)
            view = ASECustomerViewSet.as_view({'post': 'create'})
            response = view(request)
            
            if response.status_code == 201:
                assigned_to = response.data.get('assigned_to')
                self.assert_true(
                    str(assigned_to) == str(employee.id),
                    f"Customer assigned to specified employee (expected {employee.id}, got {assigned_to})"
                )
                # Cleanup
                try:
                    ASECustomer.objects.get(id=response.data.get('id')).delete()
                except:
                    pass
            else:
                self.assert_true(False, f"Creation failed with status {response.status_code}: {response.data}")
        else:
            self.warn("Missing manager or employee - skipping test")
            
        # Test 2: Employee auto-assigned to self
        self.print_test("Employee creates customer (auto-assigned to self)")
        if employee:
            request = self.factory.post('/api/ase/customers/', {
                'name': 'Test Customer Employee',
                'phone': f'8888{datetime.now().strftime("%H%M%S")}',
                'call_status': 'pending'
            }, format='json')
            force_authenticate(request, user=employee)
            view = ASECustomerViewSet.as_view({'post': 'create'})
            response = view(request)
            
            if response.status_code == 201:
                assigned_to = response.data.get('assigned_to')
                company = response.data.get('company')
                
                self.assert_true(
                    str(assigned_to) == str(employee.id),
                    f"Customer auto-assigned to employee (expected {employee.id}, got {assigned_to})"
                )
                self.assert_true(
                    company == ase_company.id,
                    f"Customer auto-assigned to correct company (expected {ase_company.id}, got {company})"
                )
                
                # Cleanup
                try:
                    ASECustomer.objects.get(id=response.data.get('id')).delete()
                except:
                    pass
            else:
                self.assert_true(False, f"Creation failed with status {response.status_code}: {response.data}")
        else:
            self.warn("No employee found - skipping test")
            
    def test_lead_creation_assignment(self, ase_company, manager, employee):
        self.print_header("TEST SUITE 4: ASE Lead Creation & Assignment")
        
        # Test: Manager can assign leads to others
        self.print_test("Manager creates lead assigned to employee")
        if manager and employee:
            request = self.factory.post('/api/ase/leads/', {
                'name': 'Test Lead Manager',
                'phone': f'7777{datetime.now().strftime("%H%M%S")}',
                'company': ase_company.id,
                'assigned_to': employee.id,
                'status': 'new'
            }, format='json')
            force_authenticate(request, user=manager)
            view = ASELeadViewSet.as_view({'post': 'create'})
            response = view(request)
            
            if response.status_code == 201:
                assigned_to = response.data.get('assigned_to')
                self.assert_true(
                    str(assigned_to) == str(employee.id),
                    f"Lead assigned to specified employee (expected {employee.id}, got {assigned_to})"
                )
                # Cleanup
                try:
                    ASELead.objects.get(id=response.data.get('id')).delete()
                except:
                    pass
            else:
                self.assert_true(False, f"Creation failed with status {response.status_code}: {response.data}")
        else:
            self.warn("Missing manager or employee - skipping test")
            
    def test_cross_company_isolation(self, ase_company, other_employee):
        self.print_header("TEST SUITE 5: Cross-Company Isolation")
        
        # Test: Non-ASE employee cannot see ASE data
        self.print_test("Non-ASE employee sees 0 ASE customers")
        if other_employee:
            request = self.factory.get('/api/ase/customers/')
            force_authenticate(request, user=other_employee)
            view = ASECustomerViewSet.as_view({'get': 'list'})
            response = view(request)
            
            if response.status_code == 200:
                results = response.data.get('results', [])
                ase_customers = [c for c in results if c.get('company') == ase_company.id]
                
                self.assert_true(
                    len(ase_customers) == 0,
                    f"Non-ASE employee sees 0 ASE customers (found {len(ase_customers)})"
                )
            else:
                self.assert_true(False, f"Request failed with status {response.status_code}")
        else:
            self.warn("No non-ASE employee found - skipping test")
            
    def print_summary(self):
        self.print_header("Test Summary")
        
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0
        
        print(f"\n{GREEN}Passed:{RESET} {self.passed}/{total}")
        print(f"{RED}Failed:{RESET} {self.failed}/{total}")
        print(f"{YELLOW}Warnings:{RESET} {self.warnings}")
        print(f"\n{BLUE}Pass Rate:{RESET} {pass_rate:.1f}%")
        
        if self.failed == 0 and self.warnings == 0:
            print(f"\n{GREEN}✓ All tests passed! Data isolation is working correctly.{RESET}")
        elif self.failed == 0:
            print(f"\n{YELLOW}⚠ All tests passed but with warnings. Review warnings above.{RESET}")
        else:
            print(f"\n{RED}✗ Some tests failed. Review failures above.{RESET}")
            
        return self.failed == 0

if __name__ == '__main__':
    test = SmokeTest()
    success = test.run_all()
    sys.exit(0 if success else 1)
