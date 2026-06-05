# 🎨 Yeonam Tester - Frontend Application (React & TypeScript)

연암 테스터(Yeonam Tester)의 사용자 인터페이스(UI)를 담당하는 프론트엔드 모듈입니다. 분석 대시보드, 분석 명세서 관리, 문서 업로드 스텝퍼 및 AI 분석 결과 시각화 카드 등 유려한 글래스모피즘(Glassmorphism) 기반 다크 테마 웹 UI를 제공합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Library**: React 18
- **Language**: TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Vanilla CSS & TailwindCSS (글래스모피즘 및 현대적인 다크 모드 스타일 레이아웃 구성)
- **Routing**: React Router DOM (v6)

---

## 📂 주요 디렉토리 구조 (Directory Structure)

```text
frontend/
├── dist/                    # 프로덕션 빌드 결과물 (빌드 시 생성)
├── node_modules/            # 패키지 의존성 파일
├── public/                  # 정적 에셋 (아이콘, 로고 등)
├── src/
│   ├── assets/              # 전역 CSS 스타일 및 이미지
│   ├── components/          # 공통 UI 컴포넌트
│   │   ├── AnalysisDeleteModal.tsx (신규: 분석 영구 파기 확인 및 예방 체크 모달)
│   │   └── ...
│   ├── pages/               # 라우팅 페이지 컴포넌트
│   │   ├── DashboardPage.tsx       # 분석 명세서(AnalysisJob) 목록 테이블 및 현황판
│   │   ├── DocumentUploadPage.tsx  # 프로젝트 생성, 문서 업로드, 분석 조건 주입 스텝퍼
│   │   └── AnalysisResultPage.tsx  # 생성된 테스트케이스 요약, 상세 카드뷰 및 PDF/MD 보고서 반출
│   ├── services/
│   │   └── api.ts                  # 백엔드 API와의 Axios 통신 모듈
│   ├── App.tsx              # 상단 통합 헤더 네비게이션 및 전체 라우터 진입점
│   └── main.tsx             # React Virtual DOM 렌더링 시작점
├── tailwind.config.js       # Tailwind CSS 테마 커스텀 설정
├── tsconfig.json            # TypeScript 컴파일 옵션
└── vite.config.ts           # Vite 번들링 및 프록시 설정
```

---

## 🌟 최근 업데이트 및 확장 스펙

개발자 및 사용자가 이해할 수 있는 주요 UI/UX 개선 내역입니다:

1. **상단 수평 네비게이션 바 통합 (레이아웃 개편)**
   - 기존의 좌측 사이드바 구조를 상단 수평 헤더 탭으로 통합 이전하였습니다. 본문 영역의 가로 너비(Width) 확보를 저해하던 패딩 구조를 제거하여 결과 보고서 및 상세 테스트 카드를 시원하고 널찍하게 조회할 수 있습니다.
2. **보안 API Key 입력 및 설정기 제공**
   - 헤더 우측의 `API Key 설정` 버튼(🔑 모양)을 통해 브라우저 로컬 저장소(`localStorage`)에 개발용/실무용 LLM API Key를 편리하게 등록 및 해제할 수 있습니다.
   - 키 보안을 위해 비밀번호 입력 필드(`<input type="password" />`) 및 드래그 복사 차단(`onCopy` 금지) 처리를 추가하였습니다.
   - API Key가 정상 등록되어 있으면 화면 우측 상단 단추가 에메랄드색(`설정됨`)으로 변하고, 문서 분석 실행 시 해당 키가 DTO에 동적으로 실려 백엔드로 전송됩니다.
3. **분석 명세서(AnalysisJob) 단위의 테이블 개편**
   - 대시보드의 관리 보드가 이전의 '개별 테스트케이스 나열' 구조에서 **'분석 명세서(AnalysisJob) 목록'** 구조로 전면 전환되었습니다. 분석 상태, 검증 관점, 분석 ID를 한눈에 모니터링할 수 있으며 개별 행을 클릭하면 해당 분석의 시각적 상세 보기 페이지로 자연스럽게 라우팅됩니다.
4. **연쇄 파기 안전 모달 (`AnalysisDeleteModal`)**
   - 분석 데이터를 삭제할 때, RDB 데이터와 S3 보고서가 동시 소멸된다는 강력한 영구 삭제 경고 및 명시적 확인 체크박스 동의 단계를 UI에 배치해 예기치 못한 데이터 유실 실수를 원천 방지합니다.

---

## 🚀 실행 및 빌드 가이드

### 사전 요구 사항
- **Node.js 18** 이상 버전이 필요합니다.
- 백엔드 API 서버(`http://localhost:8080`)가 정상 동작 중인지 확인해 주세요.

### 1. 패키지 의존성 설치
`frontend/` 디렉토리로 이동한 뒤 필요한 패키지를 설치합니다:
```bash
cd frontend
npm install
```

### 2. 로컬 개발 서버 기동
Vite 로컬 개발 서버를 기동하여 변경사항을 실시간으로 확인합니다:
```bash
npm run dev
```
- **접속 주소**: `http://localhost:5173`

### 3. 프로덕션 빌드
프로덕션 배포용 정적 파일을 번들링하기 위해 실행합니다:
```bash
npm run build
```
빌드 완료 시 `dist/` 폴더에 배포용 최적화 파일들이 생성됩니다.

---

## 🧪 UI/UX 수동 검증 가이드
- **레이아웃 확인**: 브라우저 창 크기를 줄여도 상단 수평 헤더 탭이 반응형으로 깔끔하게 조절되는지 점검합니다.
- **API Key 모달 동작**: Key를 입력 및 저장했을 때, 브라우저 콘솔 LocalStorage 영역에 키가 안전히 들어가고, 삭제 클릭 시 즉시 흔적 없이 증발하는지 점검합니다.
- **분석 목록 연쇄 삭제**: 휴지통 아이콘 클릭 시 안전 모달창이 출력되는지 확인하고, 동의 체크 박스를 클릭해야만 실제 API 통신을 거쳐 테이블 목록에서 실시간 제외되는지 점검합니다.
