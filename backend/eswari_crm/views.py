from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'Django backend is running',
        'endpoints': {
            'auth': '/api/auth/',
            'leads': '/api/leads/',
            'projects': '/api/projects/',
            'tasks': '/api/tasks/',
        }
    })