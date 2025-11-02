# BIM 기반 건축설계기준 검토 업무 지원 플랫폼

## 프로젝트 개요
BIM 기반 건축설계기준 검토 업무를 지원하는 웹 플랫폼입니다.

## 기술 스택
- **프론트엔드**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **백엔드**: Django 4.2, Django REST Framework
- **데이터베이스**: PostgreSQL 15
- **캐시**: Redis 7
- **비동기 작업**: Celery
- **웹 서버**: Nginx
- **컨테이너**: Docker, Docker Compose

## 주요 기능
1. **기준 제시**: Excel 파일을 IDS 파일로 변환
2. **기준 적용**: IDS 파일을 Blender 플러그인으로 변환
3. **기준 검토**: IFC 파일 비교 및 검토

## 프로젝트 구조
```
BIM-PROJECT/
├── frontend/                 # Next.js 프론트엔드
│   ├── pages/               # 페이지 컴포넌트
│   ├── components/          # 재사용 가능한 컴포넌트
│   ├── utils/              # 유틸리티 함수
│   └── Dockerfile
├── backend/                 # Django 백엔드
│   ├── apps/               # Django 앱들
│   │   ├── file_upload/    # 파일 업로드 관리
│   │   ├── conversion/     # 파일 변환 로직
│   │   └── comparison/     # 파일 비교 로직
│   ├── bim_project/        # Django 프로젝트 설정
│   └── Dockerfile
├── nginx/                  # Nginx 설정
├── docker-compose.yml      # Docker Compose 설정
└── env.example            # 환경 변수 예시
```

## 설치 및 실행

### 1. 환경 변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 필요한 설정을 수정하세요
```

### 2. Docker 컨테이너 빌드 및 실행
```bash
# 모든 서비스 빌드 및 실행
docker-compose up --build

# 백그라운드에서 실행
docker-compose up -d --build
```

### 3. 데이터베이스 마이그레이션
```bash
# Django 마이그레이션 실행
docker-compose exec backend python manage.py migrate

# 관리자 계정 생성
docker-compose exec backend python manage.py createsuperuser
```

### 4. 정적 파일 수집
```bash
# Django 정적 파일 수집
docker-compose exec backend python manage.py collectstatic --noinput
```

## 서비스 접속
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **관리자 페이지**: http://localhost:8000/admin
- **Nginx (통합)**: http://localhost:80

## 개발 명령어

### 프론트엔드 개발
```bash
# 프론트엔드 컨테이너 접속
docker-compose exec frontend sh

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 백엔드 개발
```bash
# 백엔드 컨테이너 접속
docker-compose exec backend sh

# Django 서버 실행
python manage.py runserver 0.0.0.0:8000

# 마이그레이션 생성
python manage.py makemigrations

# 마이그레이션 실행
python manage.py migrate
```

### Celery 작업
```bash
# Celery Worker 실행
docker-compose exec celery celery -A bim_project worker --loglevel=info

# Celery Beat 실행 (스케줄러)
docker-compose exec celery-beat celery -A bim_project beat --loglevel=info
```

## 로그 확인
```bash
# 모든 서비스 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f celery
```

## 데이터베이스 관리
```bash
# PostgreSQL 접속
docker-compose exec db psql -U bim_user -d bim_project

# 데이터베이스 백업
docker-compose exec db pg_dump -U bim_user bim_project > backup.sql

# 데이터베이스 복원
docker-compose exec -T db psql -U bim_user bim_project < backup.sql
```

## 문제 해결

### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :8000
lsof -i :5432
lsof -i :6379

# 컨테이너 중지
docker-compose down
```

### 컨테이너 재빌드
```bash
# 특정 서비스만 재빌드
docker-compose build frontend
docker-compose build backend

# 모든 서비스 재빌드
docker-compose build --no-cache
```

### 볼륨 정리
```bash
# 사용하지 않는 볼륨 삭제
docker volume prune

# 모든 볼륨 삭제 (주의!)
docker volume rm $(docker volume ls -q)
```

## 라이선스
이 프로젝트는 MIT 라이선스 하에 있습니다.
