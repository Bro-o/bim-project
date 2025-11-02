import os
from celery import Celery
from django.conf import settings


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bim_project.settings')


# Celery 인스턴스 생성: 태스크 모듈을 명시적으로 포함하여 등록 보장
celery_app = Celery('bim_project', include=['api.tasks'])

# Django settings로부터 설정 로드 (CELERY_ 네임스페이스)
celery_app.config_from_object('django.conf:settings', namespace='CELERY')

# 환경변수로 브로커/백엔드 지정이 없는 경우 settings 값을 사용
celery_app.conf.update(
    broker_url=os.getenv('CELERY_BROKER_URL', getattr(settings, 'CELERY_BROKER_URL', None)),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', getattr(settings, 'CELERY_RESULT_BACKEND', None)),
    timezone=getattr(settings, 'TIME_ZONE', 'UTC'),
)

# Django 앱들의 tasks.py 자동 탐색 (INSTALLED_APPS 기반)
celery_app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@celery_app.task(bind=True)
def debug_task(self):
    return f'Request: {self.request!r}'


