#!/usr/bin/env python
"""
Test script for Technical Team API endpoints
"""
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.contrib.auth import get_user_model
from teams.models import Team
from tech_projects.models import TechProject, TechTask
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def get_auth_token(user):
    """Get JWT token for user"""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)

def test_tech_api():
    """Test technical team API endpoints"""
    print("=" * 60)
    print("Testing Technical Team API Endpoints")
    print("=" * 60)
    
    # Get or create a technical team user
    try:
        # Find ASE Technologies company
        from accounts.models import Company
        ase_company = Company.objects.get(code='ASE')
        print(f"\n✓ Found ASE Technologies company (ID: {ase_company.id})")
        
        # Find or create technical team
        tech_team, created = Team.objects.get_or_create(
            name='Technical Team',
            team_type='technical',
            company=ase_company,
            defaults={'description': 'Development team'}
        )
        print(f"✓ Technical team: {tech_team.name} (ID: {tech_team.id})")
        
        # Find or create a technical team member
        tech_user = User.objects.filter(
            team=tech_team,
            role='employee'
        ).first()
        
        if not tech_user:
            # Create a test user
            tech_user = User.objects.create_user(
                username='tech_test_user',
                email='tech@test.com',
                password='test123',
                first_name='Tech',
                last_name='User',
                role='employee',
                company=ase_company,
                team=tech_team
            )
            print(f"✓ Created test technical user: {tech_user.username}")
        else:
            print(f"✓ Using existing technical user: {tech_user.username}")
        
        # Get auth token
        token = get_auth_token(tech_user)
        print(f"✓ Generated auth token")
        
        # Create API client
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test 1: Get project statistics
        print("\n" + "-" * 60)
        print("Test 1: GET /api/tech/projects/statistics/")
        response = client.get('/api/tech/projects/statistics/')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            print("✓ Project statistics endpoint working")
        else:
            print(f"✗ Failed: {response.content}")
        
        # Test 2: Get task statistics
        print("\n" + "-" * 60)
        print("Test 2: GET /api/tech/tasks/statistics/")
        response = client.get('/api/tech/tasks/statistics/')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
            print("✓ Task statistics endpoint working")
        else:
            print(f"✗ Failed: {response.content}")
        
        # Test 3: Get kanban board
        print("\n" + "-" * 60)
        print("Test 3: GET /api/tech/tasks/kanban/")
        response = client.get('/api/tech/tasks/kanban/')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Kanban columns: {list(data.keys())}")
            print("✓ Kanban board endpoint working")
        else:
            print(f"✗ Failed: {response.content}")
        
        # Test 4: Create a test project
        print("\n" + "-" * 60)
        print("Test 4: POST /api/tech/projects/")
        project_data = {
            'name': 'Test Project',
            'description': 'A test project for technical team',
            'status': 'active',
            'team': tech_team.id,
            'start_date': '2026-05-01',
            'end_date': '2026-12-31',
            'progress': 0
        }
        response = client.post('/api/tech/projects/', project_data, format='json')
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            project = response.json()
            print(f"Created project: {project['name']} (ID: {project['id']})")
            print("✓ Project creation working")
            
            # Test 5: Create a test task
            print("\n" + "-" * 60)
            print("Test 5: POST /api/tech/tasks/")
            task_data = {
                'title': 'Test Task',
                'description': 'A test task for the project',
                'task_type': 'feature',
                'priority': 'medium',
                'status': 'todo',
                'project': project['id'],
                'assignee': tech_user.id,
                'story_points': 3
            }
            response = client.post('/api/tech/tasks/', task_data, format='json')
            print(f"Status: {response.status_code}")
            if response.status_code == 201:
                task = response.json()
                print(f"Created task: {task['title']} (ID: {task['id']})")
                print("✓ Task creation working")
                
                # Test 6: Move task
                print("\n" + "-" * 60)
                print(f"Test 6: POST /api/tech/tasks/{task['id']}/move/")
                response = client.post(
                    f"/api/tech/tasks/{task['id']}/move/",
                    {'status': 'in_progress'},
                    format='json'
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    moved_task = response.json()
                    print(f"Task moved to: {moved_task['status']}")
                    print("✓ Task move working")
                else:
                    print(f"✗ Failed: {response.content}")
            else:
                print(f"✗ Failed: {response.content}")
        else:
            print(f"✗ Failed: {response.content}")
        
        # Test 7: Get projects list
        print("\n" + "-" * 60)
        print("Test 7: GET /api/tech/projects/")
        response = client.get('/api/tech/projects/')
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            projects = response.json()
            print(f"Found {len(projects)} projects")
            print("✓ Projects list endpoint working")
        else:
            print(f"✗ Failed: {response.content}")
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    success = test_tech_api()
    sys.exit(0 if success else 1)
