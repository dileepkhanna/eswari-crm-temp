"""
WSGI config for eswari_crm project in production.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eswari_crm.settings_production')

application = get_wsgi_application()