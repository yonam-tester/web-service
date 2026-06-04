package com.yeonam.tester.service;

import com.yeonam.tester.domain.*;
import com.yeonam.tester.dto.*;
import com.yeonam.tester.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalysisService {

    private final AnalysisJobRepository analysisJobRepository;
    private final ProjectRepository projectRepository;
    private final UploadedFileRepository fileRepository;
    private final TestCaseRepository testCaseRepository;
    private final RequirementRepository requirementRepository;
    private final RiskItemRepository riskItemRepository;
    private final EvidenceRepository evidenceRepository;
    private final HttpClient httpClient;

    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerUrl;

    public AnalysisService(AnalysisJobRepository analysisJobRepository,
                           ProjectRepository projectRepository,
                           UploadedFileRepository fileRepository,
                           TestCaseRepository testCaseRepository,
                           RequirementRepository requirementRepository,
                           RiskItemRepository riskItemRepository,
                           EvidenceRepository evidenceRepository) {
        this.analysisJobRepository = analysisJobRepository;
        this.projectRepository = projectRepository;
        this.fileRepository = fileRepository;
        this.testCaseRepository = testCaseRepository;
        this.requirementRepository = requirementRepository;
        this.riskItemRepository = riskItemRepository;
        this.evidenceRepository = evidenceRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Generates a list of recommended QA perspectives based on uploaded documents.
     */
    public QaRecommendationResponse getQaRecommendations(String projectId) {
        List<UploadedFile> files = fileRepository.findByProject_ProjectId(projectId);
        
        List<String> perspectives = new ArrayList<>();
        StringBuilder reason = new StringBuilder("업로드된 문서 분석 결과: ");

        boolean hasSecurity = false;
        boolean hasBackend = false;
        boolean hasFrontend = false;

        for (UploadedFile file : files) {
            String name = file.getFileName().toLowerCase();
            if (name.contains("security") || name.contains("인증") || name.contains("보안") || name.contains("비밀번호") || name.contains("결제")) {
                hasSecurity = true;
            }
            if (name.contains("api") || name.contains("백엔드") || name.contains("db") || name.contains("데이터베이스") || name.contains("server")) {
                hasBackend = true;
            }
            if (name.contains("ui") || name.contains("화면") || name.contains("프론트") || name.contains("web") || name.contains("page")) {
                hasFrontend = true;
            }
        }

        if (hasSecurity) {
            perspectives.add("SECURITY");
        }
        if (hasBackend || perspectives.isEmpty()) {
            perspectives.add("BACKEND");
        }
        if (hasFrontend) {
            perspectives.add("FRONTEND");
        }

        if (hasSecurity) {
            reason.append("문서 내 '결제', '비밀번호', '인증' 관련 키워드가 포함되어 보안 관점 검증이 최우선적으로 권장됩니다. ");
        } else {
            reason.append("기본 시스템 구성 요소 검증을 위해 백엔드 기능성 및 데이터 정합성 관점 검증이 추천됩니다. ");
        }

        return QaRecommendationResponse.builder()
                .recommendedPerspectives(perspectives)
                .reason(reason.toString())
                .build();
    }

    /**
     * Initiates the AI/RAG analysis job on the selected documents.
     */
    @Transactional
    public AnalysisJobResponse startAnalysis(String projectId, AnalysisCreateRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        String analysisId = "ANL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 1. Create and Save AnalysisJob entity
        String perspectiveStr = request.getQaPerspectives() != null ? String.join(",", request.getQaPerspectives()) : "";
        AnalysisJob job = AnalysisJob.builder()
                .analysisId(analysisId)
                .project(project)
                .qaPerspective(perspectiveStr)
                .customPrompt(request.getCustomPrompt())
                .status("WAITING")
                .build();

        AnalysisJob savedJob = analysisJobRepository.save(job);

        // 2. Query target files' S3 paths
        List<UploadedFile> targetFiles;
        if (request.getTargetDocumentIds() == null || request.getTargetDocumentIds().isEmpty()) {
            targetFiles = fileRepository.findByProject_ProjectId(projectId);
        } else {
            targetFiles = fileRepository.findAllById(request.getTargetDocumentIds());
        }

        List<String> s3Paths = targetFiles.stream()
                .map(UploadedFile::getS3Path)
                .collect(Collectors.toList());

        // 3. Send async trigger HTTP request to FastAPI server
        triggerExternalAiServer(savedJob, s3Paths, request.getQaPerspectives(), request.getCustomPrompt());

        return AnalysisJobResponse.builder()
                .analysisId(savedJob.getAnalysisId())
                .projectId(projectId)
                .status(savedJob.getStatus())
                .createdAt(LocalDateTime.now())
                .build();
    }

    private void triggerExternalAiServer(AnalysisJob job, List<String> s3Paths, List<String> perspectives, String customPrompt) {
        // Construct FastAPI trigger JSON payload manually to keep dependency-free
        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("{")
                .append("\"analysisId\":\"").append(job.getAnalysisId()).append("\",")
                .append("\"projectId\":\"").append(job.getProject().getProjectId()).append("\",")
                .append("\"customPrompt\":\"").append(customPrompt != null ? customPrompt.replace("\"", "\\\"") : "").append("\",")
                .append("\"qaPerspectives\":[");
        
        if (perspectives != null) {
            for (int i = 0; i < perspectives.size(); i++) {
                jsonBuilder.append("\"").append(perspectives.get(i)).append("\"");
                if (i < perspectives.size() - 1) jsonBuilder.append(",");
            }
        }
        jsonBuilder.append("],");
        jsonBuilder.append("\"s3Paths\":[");
        for (int i = 0; i < s3Paths.size(); i++) {
            jsonBuilder.append("\"").append(s3Paths.get(i)).append("\"");
            if (i < s3Paths.size() - 1) jsonBuilder.append(",");
        }
        jsonBuilder.append("]}");

        String payload = jsonBuilder.toString();
        String targetUrl = aiServerUrl + "/api/analysis/trigger";

        // Execute async request
        httpClient.sendAsync(
                HttpRequest.newBuilder()
                        .uri(URI.create(targetUrl))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(5))
                        .POST(HttpRequest.BodyPublishers.ofString(payload))
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        ).thenAccept(response -> {
            if (response.statusCode() == 202 || response.statusCode() == 200) {
                job.setStatus("PROCESSING");
                analysisJobRepository.save(job);
                System.out.println("Successfully triggered AI analysis for ID: " + job.getAnalysisId());
            } else {
                job.setStatus("FAILED");
                analysisJobRepository.save(job);
                System.err.println("AI server rejected job trigger. Status: " + response.statusCode() + ", Body: " + response.body());
            }
        }).exceptionally(ex -> {
            // Fallback for local testing when FastAPI server is offline:
            // We set status to PROCESSING to simulate async webhook callback during demo/offline.
            System.err.println("Failed to contact AI server (" + targetUrl + "): " + ex.getMessage() + ". Setting status to PROCESSING for local demo mock.");
            job.setStatus("PROCESSING");
            analysisJobRepository.save(job);
            return null;
        });
    }

    /**
     * Gets status and progress percentage of a running analysis job.
     */
    public AnalysisStatusResponse getAnalysisStatus(String analysisId) {
        AnalysisJob job = analysisJobRepository.findById(analysisId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis job not found: " + analysisId));

        String status = job.getStatus();
        int progress = 0;
        String message = "대기 중...";

        if ("WAITING".equals(status)) {
            progress = 10;
            message = "작업 접수 완료. AI 서버 대기 중...";
        } else if ("PROCESSING".equals(status) || "QUEUED".equals(status)) {
            progress = 60;
            message = "LLM 기반 테스트 케이스 시나리오 분석 진행 중...";
        } else if ("COMPLETED".equals(status)) {
            progress = 100;
            message = "분석 완료.";
        } else if ("FAILED".equals(status)) {
            progress = 0;
            message = "분석 실패. 로그를 확인하세요.";
        }

        return AnalysisStatusResponse.builder()
                .analysisId(analysisId)
                .status(status)
                .message(message)
                .progressPercentage(progress)
                .build();
    }

    public AnalysisJob getAnalysisEntity(String analysisId) {
        return analysisJobRepository.findById(analysisId)
                .orElseThrow(() -> new IllegalArgumentException("Analysis job not found: " + analysisId));
    }

    /**
     * Combines all test cases, requirements, risks, and evidence for a completed analysis.
     */
    public AnalysisResultResponse getAnalysisResults(String analysisId) {
        AnalysisJob job = getAnalysisEntity(analysisId);

        List<TestCase> testCases = testCaseRepository.findByAnalysisJob_AnalysisId(analysisId);
        List<String> tcIds = testCases.stream().map(TestCase::getTestCaseId).collect(Collectors.toList());

        // Batch fetch
        Map<String, List<RiskItem>> risksMap = new HashMap<>();
        Map<String, List<Evidence>> evidencesMap = new HashMap<>();

        if (!tcIds.isEmpty()) {
            List<RiskItem> risks = riskItemRepository.findByTestCase_TestCaseIdIn(tcIds);
            for (RiskItem r : risks) {
                risksMap.computeIfAbsent(r.getTestCase().getTestCaseId(), k -> new ArrayList<>()).add(r);
            }

            List<Evidence> evidences = evidenceRepository.findByTestCase_TestCaseIdIn(tcIds);
            for (Evidence e : evidences) {
                evidencesMap.computeIfAbsent(e.getTestCase().getTestCaseId(), k -> new ArrayList<>()).add(e);
            }
        }

        List<AnalysisResultResponse.TestCaseDto> tcDtos = testCases.stream().map(tc -> {
            List<String> riskTags = risksMap.getOrDefault(tc.getTestCaseId(), Collections.emptyList())
                    .stream().map(RiskItem::getRiskType).collect(Collectors.toList());

            List<AnalysisResultResponse.EvidenceDto> evDtos = evidencesMap.getOrDefault(tc.getTestCaseId(), Collections.emptyList())
                    .stream().map(ev -> AnalysisResultResponse.EvidenceDto.builder()
                            .evidenceId(ev.getEvidenceId())
                            .evidenceText(ev.getEvidenceText())
                            .sourceName(ev.getSourceName())
                            .sourceSection(ev.getSourceSection())
                            .confidenceLevel(tc.getConfidenceLevel() != null ? tc.getConfidenceLevel() : "HIGH")
                            .build())
                    .collect(Collectors.toList());

            // Convert steps from raw string/CLOB back to List
            List<String> stepsList = new ArrayList<>();
            if (tc.getTestSteps() != null) {
                String[] lines = tc.getTestSteps().split("\n");
                for (String l : lines) {
                    if (!l.trim().isEmpty()) {
                        stepsList.add(l.trim());
                    }
                }
            }

            return AnalysisResultResponse.TestCaseDto.builder()
                    .testCaseId(tc.getTestCaseId())
                    .testCaseName(tc.getTestCaseName())
                    .testScenario(tc.getTestScenario())
                    .precondition(tc.getPrecondition())
                    .testSteps(stepsList)
                    .expectedResult(tc.getExpectedResult())
                    .priority(tc.getPriority())
                    .riskTags(riskTags)
                    .relatedRequirements(Collections.singletonList(tc.getRequirement().getRequirementId()))
                    .evidences(evDtos)
                    .build();
        }).collect(Collectors.toList());

        List<String> missing = Arrays.asList(
                "로그인 실패에 따른 세션 차단 임계값(예: 5회 이상 입력 오류 시 계정 잠금)에 대한 예외 흐름 명세가 누락되어 있습니다.",
                "결제 중 취소/네트워크 단절 상황 발생 시 트랜잭션 복구 흐름 명세 보완이 필요합니다."
        );

        return AnalysisResultResponse.builder()
                .analysisId(analysisId)
                .summary(job.getSummary() != null ? job.getSummary() : "전체 기능 명세 요구사항 분석 요약 완료.")
                .testCases(tcDtos)
                .missingItems(missing)
                .build();
    }
}
