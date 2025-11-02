# Next.js 프론트엔드 Dockerfile
FROM --platform=linux/amd64 node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json 복사
COPY package.json ./

# 의존성 설치 (개발 환경용)
RUN npm install

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npm", "run", "dev"]
