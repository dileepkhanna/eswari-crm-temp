"""
ASGI config for eswari_crm project.

Supports both HTTP and WebSocket connections via Django Channels.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eswari_crm.settings")

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.middleware import BaseMiddleware
from django.conf import settings
from . import routing


class AllowedOriginsMiddleware(BaseMiddleware):
    """
    WebSocket middleware that validates the Origin header against
    ALLOWED_HOSTS + CORS_ALLOWED_ORIGINS instead of using the strict
    AllowedHostsOriginValidator (which blocks legitimate production origins
    when ALLOWED_HOSTS is not configured correctly).
    """

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"").decode("utf-8", errors="replace")

            if origin:
                from urllib.parse import urlparse
                parsed = urlparse(origin)
                origin_host = parsed.netloc  # e.g. "eswariconnects.com"

                allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])
                cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])

                # Build set of allowed hostnames from both lists
                allowed = set(allowed_hosts)
                for cors_origin in cors_origins:
                    try:
                        allowed.add(urlparse(cors_origin).netloc.split(":")[0])
                    except Exception:
                        pass

                # Strip port from origin host for comparison
                origin_hostname = origin_host.split(":")[0]

                if origin_hostname not in allowed and "*" not in allowed:
                    # Reject the WebSocket handshake
                    await send({"type": "websocket.close", "code": 4003})
                    return

        await super().__call__(scope, receive, send)


application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedOriginsMiddleware(
        URLRouter(routing.websocket_urlpatterns)
    ),
})
