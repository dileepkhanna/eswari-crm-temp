#!/usr/bin/env python3
"""
Generate VAPID keys and automatically update .env file.
Run: python3 generate_vapid_keys.py
"""
import base64
import os
import re
import sys

def generate_keys():
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    key = ec.generate_private_key(ec.SECP256R1())
    # Public key: uncompressed EC point (65 bytes → 87 char base64url)
    pub_bytes = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    # Private key: raw 32-byte scalar (not PEM, not DER)
    priv_scalar = key.private_numbers().private_value.to_bytes(32, 'big')

    pub_b64 = base64.urlsafe_b64encode(pub_bytes).rstrip(b'=').decode()
    priv_b64 = base64.urlsafe_b64encode(priv_scalar).rstrip(b'=').decode()
    return pub_b64, priv_b64


def update_env(env_path, pub_key, priv_key):
    with open(env_path, 'r') as f:
        content = f.read()

    # Replace or append VAPID_PUBLIC_KEY
    if re.search(r'^VAPID_PUBLIC_KEY=', content, re.MULTILINE):
        content = re.sub(r'^VAPID_PUBLIC_KEY=.*$', f'VAPID_PUBLIC_KEY={pub_key}', content, flags=re.MULTILINE)
    else:
        content += f'\nVAPID_PUBLIC_KEY={pub_key}'

    # Replace or append VAPID_PRIVATE_KEY
    if re.search(r'^VAPID_PRIVATE_KEY=', content, re.MULTILINE):
        content = re.sub(r'^VAPID_PRIVATE_KEY=.*$', f'VAPID_PRIVATE_KEY={priv_key}', content, flags=re.MULTILINE)
    else:
        content += f'\nVAPID_PRIVATE_KEY={priv_key}'

    with open(env_path, 'w') as f:
        f.write(content)


if __name__ == '__main__':
    env_path = os.path.join(os.path.dirname(__file__), '.env')

    if not os.path.exists(env_path):
        print(f'ERROR: .env not found at {env_path}')
        sys.exit(1)

    pub, priv = generate_keys()

    print(f'Generated keys:')
    print(f'  VAPID_PUBLIC_KEY={pub}')
    print(f'  VAPID_PRIVATE_KEY={priv}')

    update_env(env_path, pub, priv)
    print(f'\n.env updated successfully at {env_path}')
    print('\nIMPORTANT: Restart gunicorn for changes to take effect:')
    print('  sudo systemctl restart gunicorn')
