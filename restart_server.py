#!/usr/bin/env python3
"""
Script to restart the Django development server
"""
import os
import sys
import subprocess
import signal
import time

def restart_django_server():
    """Restart the Django development server"""
    print("🔄 Restarting Django server...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    
    # Kill any existing Django processes
    try:
        subprocess.run(['pkill', '-f', 'manage.py'], check=False)
        time.sleep(2)
    except:
        pass
    
    # Start the Django server
    print("🚀 Starting Django server on port 8001...")
    try:
        subprocess.run([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8001'
        ], check=True)
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    restart_django_server()