import subprocess
import os
import tempfile
import logging
from django.http import HttpResponse, JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import ifcopenshell
from ifctester import ids, reporter

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def excel_to_ids(request):
    """
    Excel 파일을 IDS 파일로 변환하는 API (비동기)
    """
    logger.info("=== Excel to IDS API 요청 시작 ===")
    logger.info(f"요청 메서드: {request.method}")
    logger.info(f"FILES: {request.FILES}")

    try:
        # 업로드된 Excel 파일 처리
        if 'excel_file' not in request.FILES:
            logger.error("Excel 파일이 없습니다.")
            return JsonResponse({'error': 'Excel 파일이 없습니다.'}, status=400)
        
        excel_file = request.FILES['excel_file']
        logger.info(f"업로드된 파일: {excel_file.name}, 크기: {excel_file.size}")
        
        # 파일 확장자 검증
        if not excel_file.name.lower().endswith(('.xlsx', '.xls')):
            logger.error(f"잘못된 파일 형식: {excel_file.name}")
            return JsonResponse({'error': 'Excel 파일만 업로드 가능합니다.'}, status=400)
        
        # 파일 크기 검증 (10MB 제한)
        if excel_file.size > 10 * 1024 * 1024:
            logger.error(f"파일 크기 초과: {excel_file.size} bytes")
            return JsonResponse({'error': '파일 크기는 10MB를 초과할 수 없습니다.'}, status=400)
        
        # 파일 내용을 읽어서 Celery 태스크에 전달
        file_content = excel_file.read()
        
        # Celery 태스크 실행
        from .tasks import excel_to_ids_task
        task = excel_to_ids_task.delay(file_content, excel_file.name)
        
        logger.info(f"Celery 태스크 시작: {task.id}")
        
        return JsonResponse({
            'success': True,
            'task_id': task.id,
            'message': 'Excel 파일 변환이 시작되었습니다. 작업 상태를 확인하세요.',
            'status_url': f'/api/task-status/{task.id}/'
        })
        
    except Exception as e:
        logger.error(f"API 요청 처리 중 오류: {str(e)}")
        return JsonResponse({'error': f'요청 처리 중 오류가 발생했습니다: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def download_template(request):
    """템플릿 파일 다운로드"""
    try:
        file_path = os.path.join(settings.STATIC_ROOT, 'downloads', 'Template.xlsx')
        if os.path.exists(file_path):
            response = FileResponse(open(file_path, 'rb'), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="Template.xlsx"'
            return response
        else:
            return JsonResponse({'error': '템플릿 파일을 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        logger.error(f"템플릿 다운로드 오류: {str(e)}")
        return JsonResponse({'error': f'다운로드 중 오류가 발생했습니다: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def download_manual(request):
    """매뉴얼 파일 다운로드"""
    try:
        file_path = os.path.join(settings.STATIC_ROOT, 'downloads', 'Manual.xlsx')
        if os.path.exists(file_path):
            response = FileResponse(open(file_path, 'rb'), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="Manual.xlsx"'
            return response
        else:
            return JsonResponse({'error': '매뉴얼 파일을 찾을 수 없습니다.'}, status=404)
    except Exception as e:
        logger.error(f"매뉴얼 다운로드 오류: {str(e)}")
        return JsonResponse({'error': f'다운로드 중 오류가 발생했습니다: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def ids_to_blender_addon(request):
    """
    IDS 파일을 Blender Add-on으로 변환하는 API (비동기)
    """
    logger.info("=== IDS to Blender Add-on API 요청 시작 ===")
    logger.info(f"요청 메서드: {request.method}")
    logger.info(f"FILES: {request.FILES}")
    
    try:
        # 업로드된 IDS 파일 처리
        if 'ids_file' not in request.FILES:
            logger.error("IDS 파일이 없습니다.")
            return JsonResponse({'error': 'IDS 파일이 없습니다.'}, status=400)
        
        ids_file = request.FILES['ids_file']
        logger.info(f"업로드된 파일: {ids_file.name}, 크기: {ids_file.size}")
        
        # 파일 확장자 검증
        if not ids_file.name.lower().endswith('.ids'):
            logger.error(f"잘못된 파일 형식: {ids_file.name}")
            return JsonResponse({'error': 'IDS 파일만 업로드 가능합니다.'}, status=400)
        
        # 파일 크기 검증 (10MB 제한)
        if ids_file.size > 10 * 1024 * 1024:
            logger.error(f"파일 크기 초과: {ids_file.size} bytes")
            return JsonResponse({'error': '파일 크기는 10MB를 초과할 수 없습니다.'}, status=400)
        
        # 파일 내용을 읽어서 Celery 태스크에 전달
        file_content = ids_file.read()
        
        # Celery 태스크 실행
        from .tasks import ids_to_blender_addon_task
        task = ids_to_blender_addon_task.delay(file_content, ids_file.name)
        
        logger.info(f"Celery 태스크 시작: {task.id}")
        
        return JsonResponse({
            'success': True,
            'task_id': task.id,
            'message': 'IDS 파일 변환이 시작되었습니다. 작업 상태를 확인하세요.',
            'status_url': f'/api/task-status/{task.id}/'
        })
        
    except Exception as e:
        logger.error(f"API 요청 처리 중 오류: {str(e)}")
        return JsonResponse({'error': f'요청 처리 중 오류가 발생했습니다: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def ifc_ids_review(request):
    """IFC 파일과 IDS 파일을 비교하여 검증 리포트 생성 (비동기)"""
    logger.info("=== IFC-IDS 검토 API 요청 시작 ===")
    logger.info(f"요청 메서드: {request.method}")
    logger.info(f"FILES: {request.FILES}")
    
    try:
        # 파일 검증
        if 'ifc_file' not in request.FILES:
            return JsonResponse({'error': 'IFC 파일이 없습니다.'}, status=400)
        
        if 'ids_file' not in request.FILES:
            return JsonResponse({'error': 'IDS 파일이 없습니다.'}, status=400)
        
        ifc_file = request.FILES['ifc_file']
        ids_file = request.FILES['ids_file']
        
        # 파일 형식 검증
        if not ifc_file.name.lower().endswith('.ifc'):
            return JsonResponse({'error': 'IFC 파일만 업로드 가능합니다.'}, status=400)
        
        if not ids_file.name.lower().endswith('.ids'):
            return JsonResponse({'error': 'IDS 파일만 업로드 가능합니다.'}, status=400)
        
        # 파일 크기 제한 (100MB)
        if ifc_file.size > 100 * 1024 * 1024:
            return JsonResponse({'error': 'IFC 파일 크기는 100MB를 초과할 수 없습니다.'}, status=400)
        
        if ids_file.size > 10 * 1024 * 1024:
            return JsonResponse({'error': 'IDS 파일 크기는 10MB를 초과할 수 없습니다.'}, status=400)
        
        # 파일 내용을 읽어서 Celery 태스크에 전달
        ifc_content = ifc_file.read()
        ids_content = ids_file.read()
        
        # Celery 태스크 실행
        from .tasks import ifc_ids_review_task
        task = ifc_ids_review_task.delay(ifc_content, ifc_file.name, ids_content, ids_file.name)
        
        logger.info(f"Celery 태스크 시작: {task.id}")
        
        return JsonResponse({
            'success': True,
            'task_id': task.id,
            'message': 'IFC-IDS 검토가 시작되었습니다. 작업 상태를 확인하세요.',
            'status_url': f'/api/task-status/{task.id}/'
        })
        
    except Exception as e:
        logger.error(f"API 요청 처리 중 오류: {str(e)}")
        return JsonResponse({'error': f'요청 처리 중 오류가 발생했습니다: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def task_status(request, task_id):
    """Celery 태스크 상태 확인 API"""
    try:
        from celery.result import AsyncResult
        
        # 태스크 결과 조회
        result = AsyncResult(task_id)
        
        if result.state == 'PENDING':
            response = {
                'task_id': task_id,
                'state': result.state,
                'status': '작업 대기 중...'
            }
        elif result.state == 'PROGRESS':
            response = {
                'task_id': task_id,
                'state': result.state,
                'current': result.info.get('current', 0),
                'total': result.info.get('total', 1),
                'status': result.info.get('status', '')
            }
        elif result.state == 'SUCCESS':
            response = {
                'task_id': task_id,
                'state': result.state,
                'result': result.result,
                'status': '작업 완료'
            }
        elif result.state == 'FAILURE':
            response = {
                'task_id': task_id,
                'state': result.state,
                'error': str(result.info),
                'status': '작업 실패'
            }
        else:
            response = {
                'task_id': task_id,
                'state': result.state,
                'status': '알 수 없는 상태'
            }
        
        return JsonResponse(response)
        
    except Exception as e:
        logger.error(f"태스크 상태 조회 오류: {str(e)}")
        return JsonResponse({'error': f'태스크 상태 조회 중 오류가 발생했습니다: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def download_result(request, task_id):
    """완료된 태스크의 결과 파일 다운로드 API"""
    try:
        from celery.result import AsyncResult
        
        # 태스크 결과 조회
        result = AsyncResult(task_id)
        
        if result.state != 'SUCCESS':
            return JsonResponse({'error': '작업이 아직 완료되지 않았습니다.'}, status=400)
        
        task_result = result.result
        if not task_result.get('success'):
            return JsonResponse({'error': task_result.get('error', '작업이 실패했습니다.')}, status=400)
        
        file_path = task_result.get('file_path')
        filename = task_result.get('filename')
        
        if not file_path or not os.path.exists(file_path):
            return JsonResponse({'error': '결과 파일을 찾을 수 없습니다.'}, status=404)
        
        # 파일 다운로드
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
    except Exception as e:
        logger.error(f"결과 파일 다운로드 오류: {str(e)}")
        return JsonResponse({'error': f'파일 다운로드 중 오류가 발생했습니다: {str(e)}'}, status=500)


@require_http_methods(["GET"])
def api_info(request):
    """API 정보 및 사용 가능한 엔드포인트 조회"""
    try:
        api_endpoints = {
            'excel_to_ids': {
                'url': '/api/excel-to-ids/',
                'method': 'POST',
                'description': 'Excel 파일을 IDS 파일로 변환',
                'parameters': ['excel_file (multipart/form-data)']
            },
            'download_template': {
                'url': '/api/download/template/',
                'method': 'GET',
                'description': 'Excel 템플릿 파일 다운로드',
                'parameters': []
            },
            'download_manual': {
                'url': '/api/download/manual/',
                'method': 'GET',
                'description': '사용자 매뉴얼 파일 다운로드',
                'parameters': []
            },
            'ids_to_blender_addon': {
                'url': '/api/ids-to-blender-addon/',
                'method': 'POST',
                'description': 'IDS 파일을 Blender Add-on으로 변환',
                'parameters': ['ids_file (multipart/form-data)']
            },
            'ifc_ids_review': {
                'url': '/api/ifc-ids-review/',
                'method': 'POST',
                'description': 'IFC 파일과 IDS 파일 검증 및 리뷰 리포트 생성',
                'parameters': ['ifc_file', 'ids_file (multipart/form-data)']
            },
            'task_status': {
                'url': '/api/task-status/{task_id}/',
                'method': 'GET',
                'description': '비동기 작업 상태 확인',
                'parameters': ['task_id (URL parameter)']
            },
            'download_result': {
                'url': '/api/download-result/{task_id}/',
                'method': 'GET',
                'description': '완료된 작업의 결과 파일 다운로드',
                'parameters': ['task_id (URL parameter)']
            },
            'api_info': {
                'url': '/api/api-info/',
                'method': 'GET',
                'description': 'API 정보 및 엔드포인트 목록 조회',
                'parameters': []
            }
        }
        
        return JsonResponse({
            'success': True,
            'api_name': 'BIM Project API',
            'version': '1.0.0',
            'description': 'BIM 파일 변환 및 검증을 위한 REST API',
            'endpoints': api_endpoints,
            'total_endpoints': len(api_endpoints)
        })
        
    except Exception as e:
        logger.error(f"API 정보 조회 오류: {str(e)}")
        return JsonResponse({'error': f'API 정보 조회 중 오류가 발생했습니다: {str(e)}'}, status=500)