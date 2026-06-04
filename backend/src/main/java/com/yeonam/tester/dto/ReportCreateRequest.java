package com.yeonam.tester.dto;

public class ReportCreateRequest {
    private String reportFormat;

    public ReportCreateRequest() {}

    public ReportCreateRequest(String reportFormat) {
        this.reportFormat = reportFormat;
    }

    public String getReportFormat() { return reportFormat; }
    public void setReportFormat(String reportFormat) { this.reportFormat = reportFormat; }

    public static ReportCreateRequestBuilder builder() {
        return new ReportCreateRequestBuilder();
    }

    public static class ReportCreateRequestBuilder {
        private String reportFormat;

        public ReportCreateRequestBuilder reportFormat(String reportFormat) {
            this.reportFormat = reportFormat;
            return this;
        }

        public ReportCreateRequest build() {
            return new ReportCreateRequest(reportFormat);
        }
    }
}
