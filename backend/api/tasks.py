import os
import tempfile
import subprocess
import logging
from celery import shared_task
from django.conf import settings
from ifctester import ids

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def add(self, x: int, y: int) -> int:
    return x + y


@shared_task
def ping() -> str:
    return 'pong'


@shared_task(bind=True)
def excel_to_ids_task(self, file_content: bytes, filename: str) -> dict:
    """
    Excel 파일을 IDS 파일로 변환하는 Celery 태스크
    """
    logger.info(f"=== Excel to IDS 변환 태스크 시작: {filename} ===")
    
    try:
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"임시 디렉토리 생성: {temp_dir}")

            # Excel 파일 저장
            excel_path = os.path.join(temp_dir, filename)
            with open(excel_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"Excel 파일 저장 완료: {excel_path}")
            
            # IDS-converter 실행을 위한 경로 설정
            converter_path = '/app/libs/ids-converter'
            output_path = os.path.join(temp_dir, 'output')
            os.makedirs(output_path, exist_ok=True)

            logger.info(f"IDS-converter 경로: {converter_path}")
            logger.info(f"출력 경로: {output_path}")
            
            # IDS-converter 실행
            cmd = [
                'python', 'IDS4ALL-main.py',
                '--excel_path', temp_dir + '/',
                '--excel_name', filename.split('.')[0],
                '--excel_format', '.xlsx' if filename.lower().endswith('.xlsx') else '.xls',
                '--output_path', output_path + '/'
            ]

            logger.info(f"실행 명령어: {' '.join(cmd)}")
            
            # 작업 디렉토리를 converter_path로 설정
            result = subprocess.run(
                cmd, 
                cwd=converter_path,
                capture_output=True, 
                text=True,
                timeout=60  # 60초 타임아웃
            )

            logger.info(f"IDS-converter 실행 결과: {result.returncode}")
            logger.info(f"stdout: {result.stdout}")
            logger.info(f"stderr: {result.stderr}")
            
            if result.returncode == 0:
                # 생성된 IDS 파일들 찾기
                excel_name = filename.split('.')[0]
                ids_files = []
                
                for file in os.listdir(output_path):
                    if file.startswith(f"{excel_name}_") and file.endswith('.ids'):
                        ids_files.append(file)
                
                logger.info(f"찾은 IDS 파일들: {ids_files}")
                
                if ids_files:
                    # 첫 번째 IDS 파일을 반환
                    ids_filename = ids_files[0]
                    ids_path = os.path.join(output_path, ids_filename)
                    
                    logger.info(f"반환할 IDS 파일: {ids_filename}")
                    
                    # IDS 파일 유효성 검증
                    try:
                        ids_specs = ids.open(ids_path)
                        logger.info(f"IDS 파일 검증 완료: {len(ids_specs.specifications)}개 specification")
                        
                        # IDS 파일을 읽어서 반환
                        with open(ids_path, 'rb') as f:
                            ids_content = f.read()
                        
                        # 결과를 media 폴더에 저장 (task_id 서브폴더 + 파일명 prefix)
                        task_id = getattr(self.request, 'id', None) or 'no_task_id'
                        out_dir = os.path.join(settings.MEDIA_ROOT, 'converted', task_id)
                        os.makedirs(out_dir, exist_ok=True)
                        prefixed_filename = f"{task_id}__{ids_filename}"
                        media_path = os.path.join(out_dir, prefixed_filename)
                        with open(media_path, 'wb') as f:
                            f.write(ids_content)
                        
                        return {
                            'success': True,
                            'filename': prefixed_filename,
                            'file_path': media_path,
                            'message': 'IDS 파일 변환이 완료되었습니다.'
                        }
                        
                    except Exception as validation_error:
                        logger.error(f"IDS 파일 검증 실패: {str(validation_error)}")
                        return {
                            'success': False,
                            'error': f'생성된 IDS 파일이 유효하지 않습니다: {str(validation_error)}'
                        }
                else:
                    logger.error("IDS 파일이 생성되지 않았습니다.")
                    return {
                        'success': False,
                        'error': 'IDS 파일이 생성되지 않았습니다.'
                    }
            else:
                logger.error(f"IDS 변환 실패: {result.stderr}")
                return {
                    'success': False,
                    'error': f'IDS 변환 실패: {result.stderr}'
                }
                
    except subprocess.TimeoutExpired:
        logger.error("변환 시간이 초과되었습니다.")
        return {
            'success': False,
            'error': '변환 시간이 초과되었습니다.'
        }
    except Exception as e:
        logger.error(f"변환 중 오류가 발생했습니다: {str(e)}")
        return {
            'success': False,
            'error': f'변환 중 오류가 발생했습니다: {str(e)}'
        }


@shared_task(bind=True)
def ids_to_blender_addon_task(self, file_content: bytes, filename: str) -> dict:
    """
    IDS 파일을 Blender Add-on으로 변환하는 Celery 태스크
    """
    logger.info(f"=== IDS to Blender Add-on 변환 태스크 시작: {filename} ===")
    
    try:
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"임시 디렉토리 생성: {temp_dir}")

            # IDS 파일 저장
            ids_path = os.path.join(temp_dir, filename)
            with open(ids_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"IDS 파일 저장 완료: {ids_path}")
            
            # generate_addon.py 실행을 위한 경로 설정
            generator_path = '/app/libs/blender-converter/cpted-c-generator'
            output_path = os.path.join(temp_dir, 'output/ids_auto_addon')
            os.makedirs(output_path, exist_ok=True)

            logger.info(f"Generator 경로: {generator_path}")
            logger.info(f"출력 경로: {output_path}")
            
            # generate_addon.py 실행
            cmd = [
                'python', 'generate_addon.py',
                '--ids', ids_path,
                '--out', output_path,
            ]

            logger.info(f"실행 명령어: {' '.join(cmd)}")
            
            # 작업 디렉토리를 generator_path로 설정
            result = subprocess.run(
                cmd, 
                cwd=generator_path,
                capture_output=True, 
                text=True,
                timeout=120  # 120초 타임아웃
            )

            logger.info(f"Generator 실행 결과: {result.returncode}")
            logger.info(f"stdout: {result.stdout}")
            logger.info(f"stderr: {result.stderr}")
            
            if result.returncode == 0:
                # generate_addon.py는 out_dir/zip/에 ZIP 파일을 생성
                zip_dir = os.path.join(output_path, "..", "zip")
                logger.info(f"ZIP 파일 검색 경로: {zip_dir}")
                
                # 생성된 zip 파일 찾기
                zip_files = []
                if os.path.exists(zip_dir):
                    for file in os.listdir(zip_dir):
                        if file.endswith('.zip'):
                            zip_files.append(file)
                
                logger.info(f"찾은 ZIP 파일들: {zip_files}")
                
                if zip_files:
                    # 첫 번째 zip 파일을 반환
                    zip_filename = zip_files[0]
                    zip_path = os.path.join(zip_dir, zip_filename)
                    
                    logger.info(f"반환할 ZIP 파일: {zip_filename}")
                    
                    # ZIP 파일을 읽어서 반환
                    with open(zip_path, 'rb') as f:
                        zip_content = f.read()
                    
                    # 결과를 media 폴더에 저장 (task_id 서브폴더 + 파일명 prefix)
                    task_id = getattr(self.request, 'id', None) or 'no_task_id'
                    out_dir = os.path.join(settings.MEDIA_ROOT, 'converted', task_id)
                    os.makedirs(out_dir, exist_ok=True)
                    prefixed_filename = f"{task_id}__{zip_filename}"
                    media_path = os.path.join(out_dir, prefixed_filename)
                    with open(media_path, 'wb') as f:
                        f.write(zip_content)
                    
                    return {
                        'success': True,
                        'filename': prefixed_filename,
                        'file_path': media_path,
                        'message': 'Blender Add-on 변환이 완료되었습니다.'
                    }
                else:
                    logger.error("ZIP 파일이 생성되지 않았습니다.")
                    return {
                        'success': False,
                        'error': 'ZIP 파일이 생성되지 않았습니다.'
                    }
            else:
                logger.error(f"Add-on 생성 실패: {result.stderr}")
                return {
                    'success': False,
                    'error': f'Add-on 생성 실패: {result.stderr}'
                }
                
    except subprocess.TimeoutExpired:
        logger.error("변환 시간이 초과되었습니다.")
        return {
            'success': False,
            'error': '변환 시간이 초과되었습니다.'
        }
    except Exception as e:
        logger.error(f"변환 중 오류가 발생했습니다: {str(e)}")
        return {
            'success': False,
            'error': f'변환 중 오류가 발생했습니다: {str(e)}'
        }


@shared_task(bind=True)
def ifc_ids_review_task(self, ifc_content: bytes, ifc_filename: str, ids_content: bytes, ids_filename: str) -> dict:
    """
    IFC 파일과 IDS 파일을 비교하여 검증 리포트 생성하는 Celery 태스크
    """
    logger.info(f"=== IFC-IDS 검토 태스크 시작: {ifc_filename} vs {ids_filename} ===")
    
    try:
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"임시 디렉토리 생성: {temp_dir}")
            
            # 파일 저장
            ifc_path = os.path.join(temp_dir, ifc_filename)
            ids_path = os.path.join(temp_dir, ids_filename)
            
            with open(ifc_path, 'wb') as f:
                f.write(ifc_content)
            
            with open(ids_path, 'wb') as f:
                f.write(ids_content)
            
            logger.info(f"IFC 파일 저장: {ifc_path}")
            logger.info(f"IDS 파일 저장: {ids_path}")
            
            try:
                # IFC 파일 열기
                import ifcopenshell
                ifc_model = ifcopenshell.open(ifc_path)
                logger.info("IFC 파일 로드 성공")
                
                # IDS 파일 로드
                ids_specs = ids.open(ids_path)
                logger.info("IDS 파일 로드 성공")
                
                # 검증 실행
                logger.info("IFC-IDS 검증 시작")
                ids_specs.validate(ifc_model)
                logger.info("IFC-IDS 검증 완료")
                
                # HTML 리포트 생성
                from ifctester import reporter
                html_reporter = reporter.Html(ids_specs)
                html_reporter.report()
                html_content = html_reporter.to_string()
                
                # JSON 리포트 생성
                json_reporter = reporter.Json(ids_specs)
                json_reporter.report()
                json_string = json_reporter.to_string()
                import json
                json_data = json.loads(json_string)
                
                # total_applicable이 0인 경우 status를 "skipped"로 변경
                if 'specifications' in json_data:
                    for spec in json_data['specifications']:
                        if spec.get('total_applicable', 0) == 0:
                            spec['status'] = 'skipped'
                        
                        # requirements도 동일하게 처리
                        if 'requirements' in spec:
                            for req in spec['requirements']:
                                if req.get('total_applicable', 0) == 0:
                                    req['status'] = 'skipped'
                
                # JSON 리포트에서 요약 정보 추출 (skipped 상태 고려)
                total_specs = len(json_data.get('specifications', []))
                passed_specs = 0
                failed_specs = 0
                skipped_specs = 0
                
                total_reqs = 0
                passed_reqs = 0
                failed_reqs = 0
                skipped_reqs = 0
                
                for spec in json_data.get('specifications', []):
                    if spec.get('status') == 'skipped':
                        skipped_specs += 1
                    elif spec.get('status') == True:
                        passed_specs += 1
                    else:
                        failed_specs += 1
                    
                    # requirements 통계
                    for req in spec.get('requirements', []):
                        total_reqs += 1
                        if req.get('status') == 'skipped':
                            skipped_reqs += 1
                        elif req.get('status') == True:
                            passed_reqs += 1
                        else:
                            failed_reqs += 1
                
                # 실제 검증된 항목들만으로 통계 계산
                actual_specs = passed_specs + failed_specs
                actual_reqs = passed_reqs + failed_reqs
                
                summary = {
                    'total_specifications': total_specs,
                    'passed': passed_specs,
                    'failed': failed_specs,
                    'skipped': skipped_specs,
                    'total_requirements': total_reqs,
                    'passed_requirements': passed_reqs,
                    'failed_requirements': failed_reqs,
                    'skipped_requirements': skipped_reqs,
                    'total_checks': json_data.get('total_checks', 0),
                    'passed_checks': json_data.get('total_checks_pass', 0),
                    'failed_checks': json_data.get('total_checks_fail', 0),
                    'percent_specifications_pass': round((passed_specs / actual_specs * 100) if actual_specs > 0 else 0, 1),
                    'percent_requirements_pass': round((passed_reqs / actual_reqs * 100) if actual_reqs > 0 else 0, 1),
                    'percent_checks_pass': json_data.get('percent_checks_pass', 0)
                }
                
                # 결과를 media 폴더에 저장 (task_id 서브폴더 + 파일명 prefix)
                import datetime
                task_id = getattr(self.request, 'id', None) or 'no_task_id'
                timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
                html_filename = f'review_report_{timestamp}.html'
                json_filename = f'review_report_{timestamp}.json'
                out_dir = os.path.join(settings.MEDIA_ROOT, 'reports', task_id)
                os.makedirs(out_dir, exist_ok=True)
                prefixed_html = f"{task_id}__{html_filename}"
                prefixed_json = f"{task_id}__{json_filename}"
                html_path = os.path.join(out_dir, prefixed_html)
                json_path = os.path.join(out_dir, prefixed_json)
                
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, ensure_ascii=False, indent=2)
                
                # 결과 반환
                return {
                    'success': True,
                    'message': 'IFC-IDS 검증이 완료되었습니다.',
                    'html_report_path': html_path,
                    'json_report_path': json_path,
                    'html_filename': prefixed_html,
                    'json_filename': prefixed_json,
                    'summary': summary,
                    'json_report': json_data
                }
                
            except Exception as validation_error:
                logger.error(f"검증 중 오류: {str(validation_error)}")
                return {
                    'success': False,
                    'error': f'검증 중 오류가 발생했습니다: {str(validation_error)}'
                }
    
    except Exception as e:
        logger.error(f"IFC-IDS 검토 중 오류: {str(e)}")
        return {
            'success': False,
            'error': f'검토 중 오류가 발생했습니다: {str(e)}'
        }