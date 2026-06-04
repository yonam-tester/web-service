# Yeonam Tester MVP AI Server (llm_server)

이 프로젝트는 연암 테스터 MVP 단계에서 비동기 분석 및 테스트 케이스 생성을 담당하는 경량 FastAPI 서버입니다.

## 기술 스택
- **Core:** FastAPI, Python 3.10+
- **PDF/Docx Parsing:** pypdf, python-docx
- **LLM Gateway:** LiteLLM
- **S3 Storage Client:** boto3 (MinIO 연동용)

## 프로젝트 구조
- `main.py`: FastAPI 엔트리포인트 및 작업 접수 API 라우터
- `queue_manager.py`: `asyncio.Queue` 기반 비동기 메모리 큐 및 워커 루프
- `document_parser.py`: S3에서 문서를 받아 텍스트를 추출하는 파서 모듈
- `llm_client.py`: LiteLLM 연동 및 가짜 응답을 제공하는 Mock Llm Client
- `result_formatter.py`: LLM 반환 텍스트에서 JSON 블록을 정제하고 누락 필드를 방어하는 포맷터
- `webhook_sender.py`: 처리된 결과를 Spring Boot 백엔드로 전송하는 비동기 httpx 클라이언트

---

## 실행 방법

### 1. 가상환경 설정 및 의존성 설치
`llm_server` 폴더 내에서 다음 명령어를 실행하여 가상환경을 셋업하고 필요한 의존성을 설치합니다.

```bash
# 가상환경 생성 (Windows)
python -m venv venv

# 가상환경 활성화 (Powershell)
.\venv\Scripts\Activate.ps1

# 의존성 패키지 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정
`.env` 파일을 `.env.example`을 복사하여 구성합니다.
초기 로컬 E2E 테스트 및 오프라인 상태 테스트를 위해 `MOCK_LLM=true` 상태로 가동하는 것을 권장합니다.

```env
MOCK_LLM=true
BACKEND_URL=http://localhost:8080
LLM_MODEL=gpt-4o-mini
```

### 3. FastAPI 서버 구동
서버를 `8000` 포트로 실행합니다.

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API 엔드포인트

### 1. 비동기 분석 트리거 API
- **Endpoint:** `POST /api/analysis/trigger` (또는 `POST /analyze`)
- **Body Example:**
```json
{
  "analysisId": "ANL-2026-0001",
  "projectId": "PRJ-2026-0001",
  "s3Paths": ["projects/PRJ-2026-0001/요구사항명세서.pdf"],
  "qaPerspectives": ["SECURITY", "BACKEND"],
  "customPrompt": "인증 실패 시 흐름을 추가 검증해 줘"
}
```
- **Response (202 Accepted):**
```json
{
  "message": "Job accepted and queued for analysis."
}
```

### 2. 헬스 체크 API
- **Endpoint:** `GET /health`
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "mock_llm": true,
  "queue_size": 0
}
```
