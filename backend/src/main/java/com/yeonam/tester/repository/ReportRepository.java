package com.yeonam.tester.repository;

import com.yeonam.tester.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByAnalysisJob_Project_ProjectId(String projectId);

    @Modifying
    @Query("DELETE FROM Report r WHERE r.analysisJob.project.projectId = :projectId")
    void deleteByProjectId(@Param("projectId") String projectId);
}
