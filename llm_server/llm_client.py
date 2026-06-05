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
      "riskTags": ["#인증_실패", "#입력값_오류"],
      "evidences": [
        {
          "chunkId": "CHK-001",
          "evidenceText": "사용자는 유효한 GitHub URL을 입력해야 합니다.",
          "sourceName": "요구사항_명세서.md",
          "sourceSection": "1. 프로젝트 셋업"
        }
      ],
      "category": "test_technique",
      "technique": "Negative Testing Philosophy",
      "negativeScenario": "사용자가 임의로 비공개 혹은 비정상 리포지토리 주소를 강제 제출하여 시스템 오류나 유효성 검사 우회를 시도하는 부정 시나리오 검증.",
      "tddHint": "① Invalid Github URL Mock 객체를 주입하고 throw되는 IllegalArgumentException이 Controller 단에서 400 Bad Request로 처리되는지 assert 던질 것."
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
      "riskTags": ["#입력값_오류", "#파일_유효성"],
      "evidences": [
        {
          "chunkId": "CHK-002",
          "evidenceText": "파일 업로드 시 20MB 이하, 허용 확장자(pdf/md/txt/docx)만 허용됩니다.",
          "sourceName": "요구사항_명세서.md",
          "sourceSection": "2. 문서 업로드"
        }
      ],
      "category": "test_technique",
      "technique": "Negative Testing Philosophy",
      "negativeScenario": "비인가된 확장자 파일(.hwp, .exe 등)을 업로드 시도하여 API 인터페이스 무결성 파괴를 시도하는 부정 시나리오 검증.",
      "tddHint": "① FileService.uploadFile 호출 시 허용되지 않는 확장자인 경우 IllegalArgumentException이 발생하는지 assertThrows로 검증할 것."
    }
  ]
}

def load_atlassian_knowledge() -> str:
    """
    Loads and formatting the Atlassian knowledge cards JSON file.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        filepath = os.path.join(base_dir, "md", "atlassian_knowledge_cards_refined.json")
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                cards = json.load(f)
            
            knowledge_text = ""
            for card in cards:
                knowledge_text += f"- 원칙: {card.get('title')} ({card.get('technique')})\n"
                knowledge_text += f"  QA 관점: {', '.join(card.get('qa_perspective', []))}\n"
                if card.get('tdd_hint'):
                    knowledge_text += f"  TDD 힌트: {card.get('tdd_hint')}\n"
                if card.get('example_scenario'):
                    knowledge_text += f"  예시: {card.get('example_scenario')}\n"
                knowledge_text += "\n"
            return knowledge_text
    except Exception as e:
        logger.error(f"Failed to load Atlassian knowledge base: {str(e)}")
    return "Atlassian QA Standard Principles: Focus on Negative Testing, proper Test Pyramid ratios, and Refactoring Safety."

async def call_llm(document_text: str, perspectives: list, custom_prompt: str, llm_api_key: str = None) -> str:
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
    
    atlassian_guide = load_atlassian_knowledge()
    
    system_prompt = (
        "당신은 소프트웨어 테스트 및 QA 엔지니어입니다. 입력된 소프트웨어 요구사항 명세서 본문을 바탕으로 TDD/QA 검증을 위한 테스트 케이스 목록을 생성하시오.\n\n"
        "분석 시 반드시 아래의 Atlassian QA 설계 원칙 지식을 준수하고 참고하여 분석하십시오:\n"
        f"{atlassian_guide}\n\n"
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
        "      \"riskTags\": [\"#태그1\", \"#태그2\"],\n"
        "      \"category\": \"test_level | test_technique | non_functional | qa_concept\",\n"
        "      \"technique\": \"적용한 Atlassian 설계 기법 명칭\",\n"
        "      \"tddHint\": \"TDD 설계 흐름 및 assert 비교 팁\",\n"
        "      \"negativeScenario\": \"Happy Path 너머의 의도적 파괴/예외 검증 시나리오 상세\",\n"
        "      \"evidences\": [\n"
        "        {\n"
          "          \"chunkId\": \"근거 식별 고유키 (예: CHK-001)\",\n"
        "          \"evidenceText\": \"요구사항 문서에서 인용한 핵심 텍스트 구절 원문\",\n"
        "          \"sourceName\": \"원본 문서 파일명 (예: 요구사항_명세서.md)\",\n"
        "          \"sourceSection\": \"인용한 장/절 이름 (예: 3.2 로그인 기능)\"\n"
        "        }\n"
        "      ]\n"
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
        kwargs = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
        }
        if llm_api_key and llm_api_key.strip():
            kwargs["api_key"] = llm_api_key.strip()
            logger.info("Using dynamic user-provided LLM API key.")
        else:
            logger.info("Using system-configured default LLM API key.")

        response = await litellm.acompletion(**kwargs)
        result_text = response.choices[0].message.content
        logger.info("Successfully received response from LiteLLM.")
        return result_text
    except Exception as e:
        logger.error(f"LiteLLM call failed: {str(e)}")
        raise e
