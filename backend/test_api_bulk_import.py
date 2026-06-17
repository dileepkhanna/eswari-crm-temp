"""
Test bulk import API endpoint to verify self-assignment
"""
import requests
from requests.auth import HTTPBasicAuth

# Manager credentials
USERNAME = 'khanna_manager_03'
PASSWORD = 'dileep@2004'
BASE_URL = 'http://127.0.0.1:8000'

# Login to get token (endpoint expects 'email' field for username)
login_response = requests.post(
    f'{BASE_URL}/api/auth/login/',
    json={'email': USERNAME, 'password': PASSWORD}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

response_data = login_response.json()
print(f"Login response: {response_data}")

token = response_data.get('token') or response_data.get('access') or response_data.get('access_token')
user_data = response_data.get('user', {})
user_id = user_data.get('id')
print(f"✅ Logged in as {USERNAME} (User ID: {user_id})")

# Upload CSV file for bulk import (use Bearer token for JWT)
headers = {'Authorization': f'Bearer {token}'}
files = {'file': open('test_bulk_data.csv', 'rb')}

import_response = requests.post(
    f'{BASE_URL}/api/ase/customers/import_customers/',
    headers=headers,
    files=files
)

print(f"\n📤 Bulk import response status: {import_response.status_code}")

if import_response.status_code == 201:
    result = import_response.json()
    print(f"✅ Import successful!")
    print(f"   Total created: {result['total_created']}")
    print(f"   Total errors: {result['total_errors']}")
    
    print(f"\n📋 Created customers:")
    all_assigned_to_self = True
    for customer in result['created_customers']:
        assigned_username = customer['assigned_to']
        is_self = (assigned_username == USERNAME)
        status = "✅" if is_self else "❌"
        print(f"   {status} {customer['name']} (ID: {customer['id']}) - Assigned to: {assigned_username}")
        if not is_self:
            all_assigned_to_self = False
    
    if all_assigned_to_self:
        print(f"\n✅ SUCCESS: All customers assigned to {USERNAME}!")
    else:
        print(f"\n❌ FAILED: Some customers assigned to other users!")
else:
    print(f"❌ Import failed: {import_response.text}")
