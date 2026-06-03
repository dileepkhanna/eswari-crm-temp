"""
Test script to verify WebSocket configuration is correct.
Run this from the backend directory: python test_websocket_setup.py
"""

import sys
import os
import django

# Setup Django
sys.path.append(os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings')
django.setup()

from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

print("=" * 60)
print("WebSocket Configuration Test")
print("=" * 60)

# Test 1: Check if Daphne is installed
print("\n1. Checking Daphne installation...")
try:
    import daphne
    print("   ✅ Daphne installed:", daphne.__version__)
except ImportError:
    print("   ❌ Daphne not installed! Run: pip install daphne")
    sys.exit(1)

# Test 2: Check if Channels is installed
print("\n2. Checking Channels installation...")
try:
    import channels
    print("   ✅ Channels installed:", channels.__version__)
except ImportError:
    print("   ❌ Channels not installed! Run: pip install channels")
    sys.exit(1)

# Test 3: Check ASGI_APPLICATION setting
print("\n3. Checking ASGI_APPLICATION setting...")
if hasattr(settings, 'ASGI_APPLICATION'):
    print(f"   ✅ ASGI_APPLICATION: {settings.ASGI_APPLICATION}")
else:
    print("   ❌ ASGI_APPLICATION not configured in settings.py!")
    sys.exit(1)

# Test 4: Check CHANNEL_LAYERS setting
print("\n4. Checking CHANNEL_LAYERS configuration...")
if hasattr(settings, 'CHANNEL_LAYERS'):
    channel_layers = settings.CHANNEL_LAYERS
    print(f"   ✅ CHANNEL_LAYERS configured")
    backend = channel_layers['default']['BACKEND']
    print(f"   Backend: {backend}")
    
    if 'InMemory' in backend:
        print("   ℹ️  Using InMemoryChannelLayer (good for development)")
    elif 'Redis' in backend:
        print("   ℹ️  Using RedisChannelLayer (good for production)")
else:
    print("   ❌ CHANNEL_LAYERS not configured in settings.py!")
    sys.exit(1)

# Test 5: Get channel layer instance
print("\n5. Testing channel layer connection...")
try:
    layer = get_channel_layer()
    if layer:
        print(f"   ✅ Channel layer instance: {type(layer).__name__}")
    else:
        print("   ❌ Channel layer is None!")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Error getting channel layer: {e}")
    sys.exit(1)

# Test 6: Import consumers
print("\n6. Checking WebSocket consumer...")
try:
    from eswari_crm.consumers import NotificationConsumer
    print("   ✅ NotificationConsumer imported successfully")
except ImportError as e:
    print(f"   ❌ Error importing NotificationConsumer: {e}")
    sys.exit(1)

# Test 7: Check ws_utils
print("\n7. Checking WebSocket utilities...")
try:
    from eswari_crm.ws_utils import notify_company, notify_user, notify_role
    print("   ✅ ws_utils functions imported successfully")
except ImportError as e:
    print(f"   ❌ Error importing ws_utils: {e}")
    sys.exit(1)

# Test 8: Check routing
print("\n8. Checking ASGI routing...")
try:
    from eswari_crm.asgi import application
    print("   ✅ ASGI application imported successfully")
except ImportError as e:
    print(f"   ❌ Error importing ASGI application: {e}")
    sys.exit(1)

# Test 9: Test sending a message (won't actually send without connected clients)
print("\n9. Testing message send (dry run)...")
try:
    from eswari_crm.ws_utils import _send_to_group
    # This will attempt to send but won't fail if no clients connected
    result = _send_to_group("test_group", "test_event", {"test": "data"})
    print("   ✅ Message send function works")
except Exception as e:
    print(f"   ❌ Error testing message send: {e}")
    sys.exit(1)

# Test 10: Check if views are using notifications
print("\n10. Checking if views use WebSocket notifications...")
try:
    from leads.views import LeadViewSet
    import inspect
    source = inspect.getsource(LeadViewSet.perform_create)
    if 'notify_company' in source:
        print("   ✅ leads/views.py uses notify_company")
    else:
        print("   ⚠️  leads/views.py doesn't call notify_company")
except Exception as e:
    print(f"   ⚠️  Could not check leads views: {e}")

try:
    from customers.views import CustomerViewSet
    import inspect
    source = inspect.getsource(CustomerViewSet.perform_create)
    if 'notify_company' in source:
        print("   ✅ customers/views.py uses notify_company")
    else:
        print("   ⚠️  customers/views.py doesn't call notify_company")
except Exception as e:
    print(f"   ⚠️  Could not check customers views: {e}")

try:
    from tasks.views import TaskViewSet
    import inspect
    source = inspect.getsource(TaskViewSet.perform_create)
    if 'notify_company' in source:
        print("   ✅ tasks/views.py uses notify_company")
    else:
        print("   ⚠️  tasks/views.py doesn't call notify_company")
except Exception as e:
    print(f"   ⚠️  Could not check tasks views: {e}")

# Summary
print("\n" + "=" * 60)
print("✅ WebSocket Configuration Test Complete!")
print("=" * 60)
print("\nNext steps:")
print("1. Start backend: python manage.py runserver")
print("2. Start frontend: cd ../frontend && npm run dev")
print("3. Login and check browser console for WebSocket connection")
print("4. Test with two users in different browser windows")
print("\nExpected console output:")
print("   🔌 Connecting to WebSocket: ws://localhost:8000/ws/notifications/?token=***")
print("   ✅ WebSocket connected successfully")
print("\nIf you see those messages, real-time updates are working! 🚀")
