package com.yeonam.tester.service;

import com.yeonam.tester.domain.Project;
import com.yeonam.tester.domain.UploadedFile;
import com.yeonam.tester.repository.ProjectRepository;
import com.yeonam.tester.repository.UploadedFileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    private final S3Client s3Client;
    private final UploadedFileRepository fileRepository;
    private final ProjectRepository projectRepository;

    @Value("${aws.s3.buckets.documents}")
    private String documentsBucket;

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "md", "txt", "docx");

    public FileService(S3Client s3Client, UploadedFileRepository fileRepository, ProjectRepository projectRepository) {
        this.s3Client = s3Client;
        this.fileRepository = fileRepository;
        this.projectRepository = projectRepository;
    }

    /**
     * Validates and uploads a file to S3 and records it in H2 DB.
     */
    @Transactional
    public UploadedFile uploadFile(String projectId, MultipartFile file, String fileType) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        // 1. Validation
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the 20MB limit.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("File must have a valid extension.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file extension. Allowed extensions are: " + ALLOWED_EXTENSIONS);
        }

        // 2. Upload to S3
        String fileId = "DOC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String s3Path = String.format("projects/%s/%s_%s", projectId, fileId, originalFilename);

        try {
            PutObjectRequest putOb = PutObjectRequest.builder()
                    .bucket(documentsBucket)
                    .key(s3Path)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putOb, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read upload file input stream", e);
        } catch (S3Exception e) {
            throw new RuntimeException("S3 upload failed: " + e.getMessage(), e);
        }

        // 3. Save to DB
        UploadedFile uploadedFile = UploadedFile.builder()
                .fileId(fileId)
                .project(project)
                .fileName(originalFilename)
                .fileType(fileType != null ? fileType : "REQUIREMENT_SPEC")
                .s3Path(s3Path)
                .status("UPLOADED")
                .build();

        return fileRepository.save(uploadedFile);
    }

    /**
     * Internal helper to upload raw text directly (e.g. GitHub README.md)
     */
    @Transactional
    public UploadedFile uploadRawTextFile(String projectId, String fileName, String content, String fileType) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        String fileId = "DOC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String s3Path = String.format("projects/%s/%s_%s", projectId, fileId, fileName);
        byte[] bytes = content.getBytes();

        try {
            PutObjectRequest putOb = PutObjectRequest.builder()
                    .bucket(documentsBucket)
                    .key(s3Path)
                    .contentType("text/markdown")
                    .build();

            s3Client.putObject(putOb, RequestBody.fromBytes(bytes));
        } catch (S3Exception e) {
            throw new RuntimeException("S3 raw text upload failed: " + e.getMessage(), e);
        }

        UploadedFile uploadedFile = UploadedFile.builder()
                .fileId(fileId)
                .project(project)
                .fileName(fileName)
                .fileType(fileType)
                .s3Path(s3Path)
                .status("UPLOADED")
                .build();

        return fileRepository.save(uploadedFile);
    }

    /**
     * Downloads file bytes from S3
     */
    public byte[] downloadFileBytes(UploadedFile uploadedFile) {
        try {
            GetObjectRequest getOb = GetObjectRequest.builder()
                    .bucket(documentsBucket)
                    .key(uploadedFile.getS3Path())
                    .build();

            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getOb);
            return objectBytes.asByteArray();
        } catch (S3Exception e) {
            throw new RuntimeException("Failed to download file from S3: " + e.getMessage(), e);
        }
    }

    /**
     * Deletes file from S3 bucket
     */
    public void deleteFileFromS3(String s3Path) {
        try {
            DeleteObjectRequest deleteOb = DeleteObjectRequest.builder()
                    .bucket(documentsBucket)
                    .key(s3Path)
                    .build();
            s3Client.deleteObject(deleteOb);
            System.out.println("Deleted S3 object: " + s3Path);
        } catch (S3Exception e) {
            System.err.println("Failed to delete S3 object: " + s3Path + ". Error: " + e.getMessage());
        }
    }

    /**
     * Deletes file meta-data from H2 DB and deletes from S3
     */
    @Transactional
    public void deleteFile(String fileId) {
        UploadedFile uploadedFile = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found: " + fileId));

        // Delete from S3
        deleteFileFromS3(uploadedFile.getS3Path());

        // Delete from DB
        fileRepository.delete(uploadedFile);
    }

    public List<UploadedFile> getFilesByProjectId(String projectId) {
        return fileRepository.findByProject_ProjectId(projectId);
    }

    public UploadedFile getFileById(String fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found: " + fileId));
    }
}
