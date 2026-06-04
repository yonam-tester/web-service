package com.yeonam.tester.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "test_case")
public class TestCase {

    @Id
    @Column(name = "test_case_id")
    private String testCaseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AnalysisJob analysisJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id", nullable = false)
    private Requirement requirement;

    @Column(name = "test_case_name", nullable = false)
    private String testCaseName;

    @Column(name = "test_scenario", nullable = false, columnDefinition = "TEXT")
    private String testScenario;

    @Column(name = "precondition", columnDefinition = "TEXT")
    private String precondition;

    @Lob
    @Column(name = "test_steps", columnDefinition = "CLOB")
    private String testSteps;

    @Column(name = "expected_result", nullable = false, columnDefinition = "TEXT")
    private String expectedResult;

    @Column(name = "priority", nullable = false)
    private String priority;

    @Column(name = "confidence_level")
    private String confidenceLevel;

    public TestCase() {}

    public TestCase(String testCaseId, AnalysisJob analysisJob, Requirement requirement, String testCaseName, String testScenario, String precondition, String testSteps, String expectedResult, String priority, String confidenceLevel) {
        this.testCaseId = testCaseId;
        this.analysisJob = analysisJob;
        this.requirement = requirement;
        this.testCaseName = testCaseName;
        this.testScenario = testScenario;
        this.precondition = precondition;
        this.testSteps = testSteps;
        this.expectedResult = expectedResult;
        this.priority = priority;
        this.confidenceLevel = confidenceLevel;
    }

    public String getTestCaseId() { return testCaseId; }
    public void setTestCaseId(String testCaseId) { this.testCaseId = testCaseId; }

    public AnalysisJob getAnalysisJob() { return analysisJob; }
    public void setAnalysisJob(AnalysisJob analysisJob) { this.analysisJob = analysisJob; }

    public Requirement getRequirement() { return requirement; }
    public void setRequirement(Requirement requirement) { this.requirement = requirement; }

    public String getTestCaseName() { return testCaseName; }
    public void setTestCaseName(String testCaseName) { this.testCaseName = testCaseName; }

    public String getTestScenario() { return testScenario; }
    public void setTestScenario(String testScenario) { this.testScenario = testScenario; }

    public String getPrecondition() { return precondition; }
    public void setPrecondition(String precondition) { this.precondition = precondition; }

    public String getTestSteps() { return testSteps; }
    public void setTestSteps(String testSteps) { this.testSteps = testSteps; }

    public String getExpectedResult() { return expectedResult; }
    public void setExpectedResult(String expectedResult) { this.expectedResult = expectedResult; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(String confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public static TestCaseBuilder builder() {
        return new TestCaseBuilder();
    }

    public static class TestCaseBuilder {
        private String testCaseId;
        private AnalysisJob analysisJob;
        private Requirement requirement;
        private String testCaseName;
        private String testScenario;
        private String precondition;
        private String testSteps;
        private String expectedResult;
        private String priority;
        private String confidenceLevel;

        public TestCaseBuilder testCaseId(String testCaseId) {
            this.testCaseId = testCaseId;
            return this;
        }

        public TestCaseBuilder analysisJob(AnalysisJob analysisJob) {
            this.analysisJob = analysisJob;
            return this;
        }

        public TestCaseBuilder requirement(Requirement requirement) {
            this.requirement = requirement;
            return this;
        }

        public TestCaseBuilder testCaseName(String testCaseName) {
            this.testCaseName = testCaseName;
            return this;
        }

        public TestCaseBuilder testScenario(String testScenario) {
            this.testScenario = testScenario;
            return this;
        }

        public TestCaseBuilder precondition(String precondition) {
            this.precondition = precondition;
            return this;
        }

        public TestCaseBuilder testSteps(String testSteps) {
            this.testSteps = testSteps;
            return this;
        }

        public TestCaseBuilder expectedResult(String expectedResult) {
            this.expectedResult = expectedResult;
            return this;
        }

        public TestCaseBuilder priority(String priority) {
            this.priority = priority;
            return this;
        }

        public TestCaseBuilder confidenceLevel(String confidenceLevel) {
            this.confidenceLevel = confidenceLevel;
            return this;
        }

        public TestCase build() {
            return new TestCase(testCaseId, analysisJob, requirement, testCaseName, testScenario, precondition, testSteps, expectedResult, priority, confidenceLevel);
        }
    }
}
