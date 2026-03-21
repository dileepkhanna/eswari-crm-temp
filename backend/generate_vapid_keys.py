#!/usr/bin/env python
"""
Generate VAPID keys for Web Push Notifications

Run this script to generate VAPID keys and add them to your .env file
"""

try:
    from pywebpush import webpush
    print("✓ pywebpush is installed")
except ImportError:
    print("✗ pywebpush is not installed")
    print("\nPlease install it using:")
    print("  pip install pywebpush")
    exit(1)

from py_vapid import Vapid01
from cryptography.hazmat.primitives import serialization
import base64

print("\n" + "="*60)
print("VAPID Key Generator for Web Push Notifications")
print("="*60 + "\n")

# Generate VAPID keys
vapid = Vapid01()
vapid.generate_keys()

private_key = vapid.private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode('utf-8')

public_key = vapid.public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# Convert to base64 URL-safe format
public_key_b64 = base64.urlsafe_b64encode(public_key).decode('utf-8').rstrip('=')

print("VAPID Keys Generated Successfully!\n")
print("-" * 60)
print("\nAdd these to your backend .env file:")
print("-" * 60)
print(f"VAPID_PRIVATE_KEY={private_key.replace(chr(10), '\\n')}")
print(f"VAPID_PUBLIC_KEY={public_key_b64}")
print(f"VAPID_ADMIN_EMAIL=admin@eswaricr m.com")

print("\n" + "-" * 60)
print("\nAdd this to your frontend .env file:")
print("-" * 60)
print(f"VITE_VAPID_PUBLIC_KEY={public_key_b64}")

print("\n" + "="*60)
print("Setup Complete!")
print("="*60 + "\n")
print("Next steps:")
print("1. Copy the keys above to your .env files")
print("2. Run: python manage.py makemigrations notifications")
print("3. Run: python manage.py migrate")
print("4. Restart your Django server")
print("5. Restart your React development server")
print("\n")
