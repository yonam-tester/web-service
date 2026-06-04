package com.yeonam.tester.service;

import com.yeonam.tester.domain.Report;
import com.yeonam.tester.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class ReportDownloadService {

    private final ReportRepository reportRepository;
    private final ReportAssemblyService assemblyService;
    private final ReportRenderEngine renderEngine;
    private final S3Client s3Client;

    @Value("${aws.s3.buckets.reports}")
    private String reportsBucket;

    public ReportDownloadService(ReportRepository reportRepository,
                                 ReportAssemblyService assemblyService,
                                 ReportRenderEngine renderEngine,
                                 S3Client s3Client) {
        this.reportRepository = reportRepository;
        this.assemblyService = assemblyService;
        this.renderEngine = renderEngine;
        this.s3Client = s3Client;
    }

    /**
     * Downloads a report's byte content, regenerating the file on-the-fly if it has been lost in S3.
     */
    @Transactional
    public byte[] downloadReportBytes(String reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        boolean fileExists = true;
        try {
            // Check if file exists in S3
            HeadObjectRequest headOb = HeadObjectRequest.builder()
                    .bucket(reportsBucket)
                    .key(report.getS3Path())
                    .build();
            s3Client.headObject(headOb);
        } catch (NoSuchKeyException e) {
            fileExists = false;
        } catch (Exception e) {
            // Treat generic errors/connection errors as missing to trigger regeneration fallback
            fileExists = false;
        }

        if (fileExists) {
            // File exists: download and return
            try {
                GetObjectRequest getOb = GetObjectRequest.builder()
                        .bucket(reportsBucket)
                        .key(report.getS3Path())
                        .build();
                ResponseBytes<?> responseBytes = s3Client.getObjectAsBytes(getOb);
                return responseBytes.asByteArray();
            } catch (Exception e) {
                System.err.println("Failed to read report from S3: " + e.getMessage() + ". Regenerating as fallback...");
            }
        }

        // File is missing or download failed: auto-regenerate (Fallback Recovery)
        System.out.println("File lost in S3, auto-regenerating report: " + reportId);
        String format = report.getFormat();
        String analysisId = report.getAnalysisJob().getAnalysisId();

        Map<String, Object> data = assemblyService.assembleReportData(analysisId);
        String markdown = renderEngine.renderMarkdown(data);
        byte[] bytes;

        if ("PDF".equals(format)) {
            bytes = renderEngine.renderPdf(markdown);
        } else {
            bytes = markdown.getBytes(StandardCharsets.UTF_8);
        }

        // Upload regenerated file back to S3
        try {
            PutObjectRequest putOb = PutObjectRequest.builder()
                    .bucket(reportsBucket)
                    .key(report.getS3Path())
                    .contentType("PDF".equals(format) ? "application/pdf" : "text/markdown")
                    .build();

            s3Client.putObject(putOb, RequestBody.fromBytes(bytes));
        } catch (Exception e) {
            System.err.println("Failed to upload regenerated report: " + e.getMessage());
        }

        return bytes;
    }
}
