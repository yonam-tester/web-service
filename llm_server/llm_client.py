import os
import json
import logging
import asyncio
import litellm

logger = logging.getLogger("llm_server.llm_client")

MOCK_RESPONSE = {
  "summary": "업로드된 문서를 분석한 결과, 사용자 인증 및 파일 업로드 기능에 대한 테스트가 필요합니다.",
  "requirements": [
    {"id": "REQ-001", "text": "사용자는 유효한 GitHub URL을 입력해야 합니다."},
    {"id": "REQ-002", "text": "파일 업로드 시 20MB 이하, 허용 확장자(pdf/md/txt/docx)만 허용됩니다."}
  ],
  "testCases": [
    {
      "testCaseId": "TC-001",
      "requirementId": "REQ-001",
      "testCaseName": "유효하지 않은 GitHub URL 입력 시 오류 반환 검증",
      "testScenario": "비공개 리포지토리 URL 입력 시 백엔드 유효성 검사 동작 확인",
      "precondition": "사용자가 프로젝트 셋업 화면에 접근한 상태",
      "testSteps": "1. GitHub URL 필드에 비공개 리포지토리 주소 입력\n2. 제출 버튼 클릭\n3. 응답 상태 코드 확인",
      "expectedResult": "HTTP 400 또는 422 에러와 함께 '유효하지 않은 리포지토리' 메시지 반환",
      "priority": "HIGH",
      "confidenceLevel": "HIGH",
      "riskTags": ["#인증_실패", "#입력값_오류"]
    },
    {
      "testCaseId": "TC-002",
      "requirementId": "REQ-002",
      "testCaseName": "허용되지 않는 파일 형식 업로드 차단 검증",
      "testScenario": "HWP 파일을 업로드 시도할 경우 프론트엔드 및 백엔드 이중 차단 동작 확인",
      "precondition": "프로젝트가 생성된 상태에서 문서 업로드 화면 접근",
      "testSteps": "1. .hwp 확장자 파일 선택\n2. 드래그 앤 드롭 또는 파일 선택 다이얼로그 사용\n3. 업로드 시도",
      "expectedResult": "프론트엔드에서 즉시 차단 알림 표출, 백엔드 API 도달 전에 필터링됨",
      "priority": "MEDIUM",
      "confidenceLevel": "HIGH",
      "riskTags": ["#입력값_오류", "#파일_유효성"]
    }
  ]
}

async def call_llm(document_text: str, perspectives: list, custom_prompt: str) -> str:
    """
    Calls the LLM via LiteLLM. If MOCK_LLM=true, returns mock data after a short sleep.
    """
    mock_llm = os.getenv("MOCK_LLM", "true").lower() == "true"
    
    if mock_llm:
        logger.info("MOCK_LLM is enabled. Simulating LLM call...")
        await asyncio.sleep(2.0)  # Simulate API latency
        return json.dumps(MOCK_RESPONSE, ensure_ascii=False)
        
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    logger.info(f"Calling real LLM model: {model}")
    
    system_prompt = (
        "당신은 소프트웨어 테스트 및 QA 엔지니어입니다. 입력된 소프트웨어 요구사항 명세서 본문을 바탕으로 TDD/QA 검증을 위한 테스트 케이스 목록을 생성하시오.\n\n"
        "반드시 아래 JSON 형식으로 응답하여야 하며, 백틱(```json ... ```) 블록으로 감싸주십시오. 필수 키는 다음과 같습니다:\n"
        "{\n"
        "  \"summary\": \"전체 문서 분석 요약문\",\n"
        "  \"requirements\": [ {\"id\": \"REQ-001\", \"text\": \"요구사항 텍스트\"} ],\n"
        "  \"testCases\": [\n"
        "    {\n"
        "      \"testCaseId\": \"TC-001\",\n"
        "      \"requirementId\": \"REQ-001\",\n"
        "      \"testCaseName\": \"테스트 케이스 명칭\",\n"
        "      \"testScenario\": \"상세 검증 시나리오\",\n"
        "      \"precondition\": \"사전 조건\",\n"
        "      \"testSteps\": \"1. 단계1\\n2. 단계2\\n3. 단계3\",\n"
        "      \"expectedResult\": \"기대 결과\",\n"
        "      \"priority\": \"HIGH | MEDIUM | LOW\",\n"
        "      \"confidenceLevel\": \"HIGH | MEDIUM | LOW\",\n"
        "      \"riskTags\": [\"#태그1\", \"#태그2\"]\n"
        "    }\n"
        "  ]\n"
        "}\n"
    )
    
    user_prompt = f"### 요구사항 문서 텍스트:\n{document_text}\n\n"
    if perspectives:
        user_prompt += f"### 중점 검증 관점(QA Perspectives):\n{', '.join(perspectives)}\n\n"
    if custom_prompt:
        user_prompt += f"### 사용자 추가 요청 사항(Custom Prompt):\n{custom_prompt}\n\n"
        
    user_prompt += "위 정보에 최적화하여 완벽한 JSON 구조로 응답해주세요."

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
        )
        result_text = response.choices[0].message.content
        logger.info("Successfully received response from LiteLLM.")
        return result_text
    except Exception as e:
        logger.error(f"LiteLLM call failed: {str(e)}")
        raise e
