# Django 백엔드 Dockerfile
FROM --platform=linux/amd64 python:3.11-slim

# 시스템 패키지 업데이트 및 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# Python 의존성 파일 복사
COPY requirements.txt .

# Python 의존성 설치 (모든 패키지를 한 번에)
RUN pip install --no-cache-dir -r requirements.txt

# IfcOpenShell 설치 (Python 3.11용)
# RUN wget https://github.com/IfcOpenShell/IfcOpenShell/releases/download/ifcopenshell-python-0.8.3.post1/ifcopenshell-python-0.8.3.post1-py311-linux64.zip && \
#     unzip ifcopenshell-python-0.8.3.post1-py311-linux64.zip && \
#     cp -r ifcopenshell-python-0.8.3.post1-py311-linux64/ifcopenshell /usr/local/lib/python3.11/site-packages/ && \
#     rm -rf ifcopenshell-python-0.8.3.post1-py311-linux64*

# 소스 코드 복사
COPY . .

# IDS-converter 디렉토리 존재 확인
RUN echo "=== IDS-converter 파일 확인 ===" && \
    ls -la /app/libs/ids-converter/ && \
    echo "=== IDS-converter 설치 완료 ==="

# 정적 파일 및 로그 디렉토리 생성
RUN mkdir -p /app/static /app/media /app/logs

# 포트 노출
EXPOSE 8000

# Django 서버 실행
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]