#!/usr/bin/env python
"""
Script to generate a comprehensive report of all users and their companies
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from accounts.models import User, Company
from django.db.models import Count

def generate_user_report():
    print("=" * 100)
    print("USER & COMPANY REPORT")
    print("=" * 100)
    print()
    
    # Overall statistics
    total_users = User.objects.count()
    total_companies = Company.objects.count()
    
    print(f"📊 OVERALL STATISTICS:")
    print(f"   Total Users: {total_users}")
    print(f"   Total Companies: {total_companies}")
    print()
    
    # Company breakdown
    print("=" * 100)
    print("USERS BY COMPANY")
    print("=" * 100)
    print()
    
    companies = Company.objects.all().order_by('id')
    
    for company in companies:
        users = User.objects.filter(company=company).order_by('role', 'first_name')
        user_count = users.count()
        
        print(f"🏢 {company.name} (ID: {company.id}, Code: {company.code})")
        print(f"   Total Users: {user_count}")
        print()
        
        if user_count > 0:
            # Group by role
            roles = {}
            for user in users:
                role = user.get_role_display()
                if role not in roles:
                    roles[role] = []
                roles[role].append(user)
            
            for role, role_users in roles.items():
                print(f"   {role} ({len(role_users)}):")
                for user in role_users:
                    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                    team_info = f" → Team: {user.team.name}" if user.team else ""
                    manager_info = f" → Manager: {user.manager.first_name} {user.manager.last_name}" if user.manager else ""
                    print(f"      • {full_name} ({user.username}){team_info}{manager_info}")
                print()
        else:
            print("   ⚠️  No users assigned to this company")
            print()
    
    # Users without company
    print("=" * 100)
    print("USERS WITHOUT COMPANY")
    print("=" * 100)
    print()
    
    users_without_company = User.objects.filter(company__isnull=True).order_by('role', 'first_name')
    no_company_count = users_without_company.count()
    
    if no_company_count > 0:
        print(f"   Total: {no_company_count}")
        print()
        for user in users_without_company:
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            print(f"   • {full_name} ({user.username}) - {user.get_role_display()}")
        print()
    else:
        print("   ✅ All users are assigned to a company")
        print()
    
    # Role distribution
    print("=" * 100)
    print("USERS BY ROLE")
    print("=" * 100)
    print()
    
    role_counts = User.objects.values('role').annotate(count=Count('role')).order_by('-count')
    
    role_names = {
        'admin': 'Admin',
        'hr': 'HR',
        'manager': 'Manager',
        'team_lead': 'Team Lead',
        'employee': 'Employee'
    }
    
    for role_data in role_counts:
        role = role_data['role']
        count = role_data['count']
        role_display = role_names.get(role, role)
        print(f"   {role_display}: {count} users")
    
    print()
    
    # Team assignments (for ASE Technologies)
    print("=" * 100)
    print("TEAM ASSIGNMENTS (ASE Technologies)")
    print("=" * 100)
    print()
    
    ase_company = Company.objects.filter(id=2).first()
    if ase_company:
        ase_users = User.objects.filter(company=ase_company)
        users_with_team = ase_users.filter(team__isnull=False).count()
        users_without_team = ase_users.filter(team__isnull=True).count()
        
        print(f"   Total ASE Users: {ase_users.count()}")
        print(f"   Users with Team: {users_with_team}")
        print(f"   Users without Team: {users_without_team}")
        print()
        
        if users_with_team > 0:
            print("   Users with Team Assignments:")
            for user in ase_users.filter(team__isnull=False).order_by('team__name'):
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                print(f"      • {full_name} ({user.username}) → {user.team.name}")
            print()
    
    print("=" * 100)
    print("END OF REPORT")
    print("=" * 100)

if __name__ == '__main__':
    generate_user_report()
