package com.yeonam.tester.repository;

import com.yeonam.tester.domain.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, String> {
    List<TestCase> findByAnalysisJob_AnalysisId(String analysisId);

    @Modifying
    @Query("DELETE FROM TestCase t WHERE t.analysisJob.analysisId IN :analysisIds")
    void deleteByAnalysisIds(@Param("analysisIds") List<String> analysisIds);
}
