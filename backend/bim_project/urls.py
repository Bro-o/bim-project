"""
URL configuration for bim_project project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # API 앱 URL 포함
    # path('api/', include('apps.file_upload.urls')),  # 임시 주석 처리
    # path('api/', include('apps.conversion.urls')),   # 임시 주석 처리
    # path('api/', include('apps.comparison.urls')),   # 임시 주석 처리
]

# 개발 환경에서 미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)