"""
WSGI config for bim_project project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bim_project.settings')

application = get_wsgi_application()
