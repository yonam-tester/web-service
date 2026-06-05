# ☕ Yeonam Tester - Backend Service (Spring Boot)

연암 테스터(Yeonam Tester)의 백엔드 서비스 모듈입니다. 프론트엔드의 요청을 처리하고, 업로드된 문서 파일을 MinIO(S3 호환 스토리지)에 저장하며, 비동기 AI 분석 작업을 FastAPI 서버로 트리거하고, 분석 결과를 영속화 및 보고서(Markdown) 파일로 합성하여 제공하는 역할을 담당합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Spring Boot 3.3.0
- **Language**: Java 17
- **Database**: H2 Database (File Mode, Embedded)
- **ORM**: Spring Data JPA / Hibernate
- **Object Storage**: MinIO (AWS Java SDK S3 연동)
- **Build Tool**: Apache Maven (Maven Wrapper 내장)

---

## 📂 주요 디렉토리 구조 (Directory Structure)

```text
backend/
├── .maven/                  # 내장 Maven Wrapper 바이너리 및 설정
├── data/                    # H2 RDB 파일 적재용 폴더 (yeonam_db.mv.db 등)
├── src/
│   ├── main/
│   │   ├── java/com/yeonam/tester/
│   │   │   ├── TesterApplication.java    # 백엔드 애플리케이션 진입점
│   │   │   ├── controller/               # REST API 컨트롤러
│   │   │   │   ├── AnalysisController.java
│   │   │   │   ├── ReportController.java
│   │   │   │   └── TestCaseController.java (신규: 개별 테스트케이스 수정 등)
│   │   │   ├── domain/                   # JPA Entity 모델 (Report, TestCase, ReportTestCase 등)
│   │   │   ├── dto/                      # API 요청/응답용 Data Transfer Object
│   │   │   ├── repository/               # Spring Data JPA Repository 인터페이스
│   │   │   └── service/                  # 비즈니스 로직 처리 레이어
│   │   │       ├── AnalysisService.java   # 비동기 AI 분석 및 연쇄 삭제 기능
│   │   │       ├── CallbackService.java   # FastAPI 웹훅 수신 및 결과 파싱
│   │   │       ├── FileService.java       # MinIO(S3) 파일 업로드 및 유효성 검사
│   │   │       ├── ReportService.java     # 보고서 생성 및 매핑 관리
│   │   │       └── TestCaseService.java   # 테스트케이스 관리 및 수정 로직
│   │   └── resources/
│   │       ├── application.yml           # 데이터베이스, S3, API 주소 등 환경 설정
│   │       └── schema.sql                # 테이블 정의 및 DDL 스키마 스크립트
│   └── test/                             # JUnit 통합 테스트 및 기능 검증 테스트
```

---

## 🌟 최근 업데이트 및 확장 스펙

다른 팀원이나 유지보수자가 참고할 수 있는 최근 구현/개선 사항입니다:

1. **사용자 입력 LLM API Key 전달**
   - 사용자가 프론트엔드에서 입력한 LLM API Key(`llmApiKey`)를 백엔드가 수신하여, FastAPI AI 서버의 비동기 분석 요청을 트리거할 때 안전하게 바디 페이로드에 태워 연계합니다.
2. **다중 분석 작업(AnalysisJob) 테스트케이스 통합 보고서 생성**
   - 기존에는 동일한 분석 작업에 포함된 테스트케이스만 하나의 보고서로 묶을 수 있었으나, **복수의 서로 다른 분석 작업(AnalysisJob) 소속 테스트케이스들도 하나의 보고서로 합성**할 수 있도록 데이터 구조와 팩토리 로직(`ReportAssemblyService.java`, `ReportService.java`)을 확장했습니다.
3. **분석 명세서(AnalysisJob) 단위의 완전 연쇄 파기 (Cascading Delete)**
   - 특정 분석 기록을 삭제할 경우, 관계형 DB에 영속화된 **요구사항(Requirement), 테스트케이스(TestCase), 검증 근거(Evidence), 위험 항목(RiskItem)**뿐만 아니라, **MinIO(S3) 스토리지에 업로드된 물리 보고서 파일까지 일체 동기화되어 영구 소멸**되도록 트랜잭션 안정성을 강화했습니다.

---

## 🚀 실행 및 빌드 가이드

### 사전 요구 사항
- 로컬 또는 Docker 환경에 **MinIO 스토리지**가 실행 중이어야 합니다. (루트의 `docker-compose.yml` 참고)
- Java JDK 17 이상이 설치되어 있어야 합니다.

### 1. 백엔드 기동
루트 폴더에서 `backend` 디렉토리로 이동한 뒤, 내장된 Maven Wrapper 명령어로 스프링 부트를 기동합니다.
```bash
cd backend

# Windows PowerShell 또는 cmd 공통
.maven\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```
- **API 서버 주소**: `http://localhost:8080`
- **H2 데이터베이스 콘솔**: `http://localhost:8080/h2-console`
  - *JDBC URL*: `jdbc:h2:file:./data/yeonam_db`
  - *사용자 ID*: `sa`
  - *비밀번호*: 없음 (공란)

### 2. 빌드 및 패키징
실 배포용 jar 파일로 빌드하기 위해 다음 명령을 실행합니다.
```bash
.maven\apache-maven-3.9.6\bin\mvn.cmd clean package
```
빌드가 완료되면 `target/tester-0.0.1-SNAPSHOT.jar` 파일이 생성됩니다.

---

## 🧪 자동화 테스트 검증 (JUnit 5)

새로 추가된 데이터 확장 아키텍처와 통합 보고서, 연쇄 파기 파이프라인의 기능 정합성을 검증하기 위해 통합 테스트 코드가 작성되어 있습니다.

터미널에서 아래 테스트 명령어로 검증이 가능합니다:

```bash
# 1. API Key 전달 파이프라인 DTO 정합성 검증
.maven\apache-maven-3.9.6\bin\mvn.cmd test -Dtest=Phase6ExtensionsTests#testAnalysisTriggerWithCustomApiKey

# 2. 다중 분석 작업 출신 테스트케이스 통합 보고서 생성 검증
.maven\apache-maven-3.9.6\bin\mvn.cmd test -Dtest=Phase6ExtensionsTests#testGenerateReportWithMultiJobTestCases

# 3. 분석 명세서 삭제 시 RDB / S3 연쇄 파기 트랜잭션 검증
.maven\apache-maven-3.9.6\bin\mvn.cmd test -Dtest=Phase6ExtensionsTests#testDeleteAnalysisJobCascades
```

---

## 💡 개발 및 협업 팁 (Developer Notes)
- **로컬 H2 데이터베이스 초기화**: 스키마 구조 변경이나 테스트 데이터 꼬임 현상이 일어난 경우, 백엔드 서버를 종료하고 `backend/data/yeonam_db.mv.db` 파일을 과감히 삭제한 뒤 백엔드 서버를 재시작하면 `resources/schema.sql`에 설정된 DDL 스키마 스크립트를 기반으로 데이터베이스가 깨끗하게 재생성됩니다.
- **MinIO 스토리지 연동 문제**: 서버 부팅 시 백엔드가 MinIO 버킷(`yeonam-documents`, `yeonam-reports`)의 존재를 먼저 점검하고 자동 생성합니다. 만약 S3 연결 에러가 발생한다면 Docker Container 상의 MinIO(9000번 포트)가 정상적으로 바인딩되었는지 체크해 주세요.
