import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { projectApi, fileApi, reportApi, Project, UploadedFile, ReportItem } from '../services/api';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search history state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<UploadedFile | null>(null);
  const [docDeleteChecked, setDocDeleteChecked] = useState(false);

  const [isProjDeleteModalOpen, setIsProjDeleteModalOpen] = useState(false);
  const [projToDelete, setProjToDelete] = useState<Project | null>(null);
  const [projDeleteChecked, setProjDeleteChecked] = useState(false);
  const [projDeleteConfirmText, setProjDeleteConfirmText] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await projectApi.getAll();
      setProjects(response.data);
      
      const urlProjId = searchParams.get('projectId');
      if (urlProjId && response.data.some(p => p.projectId === urlProjId)) {
        setSelectedProjectId(urlProjId);
      } else if (response.data.length > 0) {
        setSelectedProjectId(response.data[0].projectId);
      }
    } catch (err: any) {
      console.error(err);
      setError('프로젝트 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      setSearchParams({ projectId: selectedProjectId });
      fetchProjectDetails(selectedProjectId);
    } else {
      setProjectDetails(null);
      setFiles([]);
      setReports([]);
    }
  }, [selectedProjectId]);

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const projResp = await projectApi.getById(projectId);
      setProjectDetails(projResp.data);

      const filesResp = await fileApi.getByProject(projectId);
      setFiles(filesResp.data);

      const reportsResp = await reportApi.getByProject(projectId);
      setReports(reportsResp.data.reports || []);
    } catch (err: any) {
      console.error(err);
      setError('프로젝트 세부 데이터를 불러오는 데 실패했습니다.');
    }
  };

  const handleDownloadFile = (fileId: string, fileName: string) => {
    const url = fileApi.download(fileId);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = (reportId: string, format: string) => {
    const url = reportApi.download(reportId);
    const link = document.createElement('a');
    link.href = url;
    const extension = format.toLowerCase() === 'pdf' ? 'pdf' : 'md';
    link.setAttribute('download', `QA_Report_${reportId}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Document deletion handlers
  const openDocDeleteModal = (file: UploadedFile) => {
    setDocToDelete(file);
    setDocDeleteChecked(false);
    setIsDocDeleteModalOpen(true);
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      await fileApi.delete(docToDelete.documentId);
      setIsDocDeleteModalOpen(false);
      setDocToDelete(null);
      if (selectedProjectId) fetchProjectDetails(selectedProjectId);
    } catch (err: any) {
      console.error(err);
      alert('문서 삭제에 실패했습니다.');
    }
  };

  // Project deletion handlers
  const openProjDeleteModal = (project: Project) => {
    setProjToDelete(project);
    setProjDeleteChecked(false);
    setProjDeleteConfirmText('');
    setIsProjDeleteModalOpen(true);
  };

  const handleDeleteProj = async () => {
    if (!projToDelete) return;
    try {
      await projectApi.delete(projToDelete.projectId);
      setIsProjDeleteModalOpen(false);
      setProjToDelete(null);
      
      // If deleted project was currently selected, select another one or reset
      if (selectedProjectId === projToDelete.projectId) {
        setSelectedProjectId('');
      }
      fetchProjects();
    } catch (err: any) {
      console.error(err);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  // Filtered reports list for query
  const filteredReports = reports.filter(r => 
    r.reportId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.analysisId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-lg animate-in fade-in duration-500">
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
          <span className="material-symbols-outlined text-red-400">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Registered Projects */}
      <section>
        <div className="flex justify-between items-end mb-md">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">rocket_launch</span>
              등록된 프로젝트
            </h2>
            <p className="text-on-surface-variant font-body-sm text-body-sm">활성화된 QA 세션 및 소스 코드 연동 현황</p>
          </div>
        </div>

        {loading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <span className="material-symbols-outlined text-4xl text-indigo-400 animate-spin">progress_activity</span>
            <p className="text-secondary text-sm font-mono">로딩 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {projects.map((project) => (
              <div 
                key={project.projectId}
                onClick={() => setSelectedProjectId(project.projectId)}
                className={`glass-panel rounded-xl p-md relative group hover:scale-[1.02] transition-all duration-300 cursor-pointer ${
                  project.projectId === selectedProjectId 
                    ? 'ring-2 ring-primary/60 border-primary/50' 
                    : ''
                }`}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openProjDeleteModal(project);
                  }}
                  className="absolute top-4 right-4 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/5"
                  title="프로젝트 삭제"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <div className="flex items-center gap-3 mb-4 pr-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">deployed_code</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface truncate">{project.projectName}</h3>
                    {project.integrationStatus === 'SUCCESS' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 inline-flex items-center w-fit mt-1">
                        <span className="status-dot bg-emerald-500 mr-1"></span> 연동 완료
                      </span>
                    ) : (
                      <span className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 inline-flex items-center w-fit mt-1">
                        <span className="status-dot bg-yellow-500 mr-1 animate-pulse"></span> 연동 대기
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-on-surface-variant font-body-sm text-body-sm mb-6 line-clamp-2 min-h-[40px]">
                  {project.description || '설명이 등록되지 않은 프로젝트입니다.'}
                </p>
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 text-on-surface-variant font-code-sm text-code-sm min-w-0">
                    <span className="material-symbols-outlined text-[16px] shrink-0">link</span>
                    <span className="truncate">{project.githubUrl || '로컬 환경'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant font-code-sm text-code-sm">
                    <span className="material-symbols-outlined text-[16px] shrink-0">account_tree</span>
                    <span>branch: {project.githubBranch || 'none'}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State / Add New Card */}
            <div 
              onClick={() => navigate('/setup')}
              className="border-2 border-dashed border-white/10 rounded-xl p-md flex flex-col items-center justify-center text-on-surface-variant hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group min-h-[220px]"
            >
              <span className="material-symbols-outlined text-4xl mb-2 group-hover:scale-110 transition-transform text-indigo-400">add_circle</span>
              <p className="font-bold text-white">새 프로젝트 연동</p>
              <p className="text-[12px] opacity-60">GitHub 레포지토리 연결</p>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Uploaded Documents */}
      {projectDetails && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-md">
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">data_object</span>
              문서 업로드 및 전처리 현황
            </h2>
            <button
              onClick={() => navigate(`/upload-demo?projectId=${selectedProjectId}`)}
              className="primary-gradient px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 active:scale-95 transition-transform text-xs"
              style={{ background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}
            >
              <span className="material-symbols-outlined text-xs">add</span>
              문서 추가
            </button>
          </div>
          
          <div className="glass-panel rounded-xl overflow-hidden">
            {files.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                업로드된 기획 문서가 없습니다. 우측 상단의 '문서 추가' 버튼을 눌러 기획서를 업로드해 주세요.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">No</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">Filename</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">Type</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">Size</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 font-label-caps text-label-caps text-on-surface-variant text-right">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {files.map((file, idx) => (
                    <tr key={file.documentId} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-code-sm text-code-sm">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-6 py-4 font-body-md text-body-md truncate max-w-xs md:max-w-md">{file.fileName}</td>
                      <td className="px-6 py-4">
                        {file.fileType === 'REQUIREMENT_SPEC' ? (
                          <span className="text-xs bg-primary/20 text-indigo-200 border border-primary/20 px-2 py-1 rounded">요구사항 명세서</span>
                        ) : (
                          <span className="text-xs bg-tertiary/20 text-purple-200 border border-tertiary/20 px-2 py-1 rounded">참조 문서</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-code-sm text-code-sm">{formatFileSize(file.fileSizeByte)}</td>
                      <td className="px-6 py-4">
                        {file.status === 'DONE' && (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                            <span className="material-symbols-outlined text-sm">check_circle</span> 완료
                          </span>
                        )}
                        {(file.status === 'PROCESSING' || file.status === 'PARSING' || file.status === 'UPLOADED') && (
                          <span className="flex items-center gap-1.5 text-orange-400 font-bold text-xs animate-pulse">
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> 진행 중
                          </span>
                        )}
                        {file.status === 'FAILED' && (
                          <span className="flex items-center gap-1.5 text-error font-bold text-xs">
                            <span className="material-symbols-outlined text-sm">error</span> 실패
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleDownloadFile(file.documentId, file.fileName)}
                          className="p-2 hover:bg-white/10 rounded-lg text-on-surface-variant transition-colors"
                          title="다운로드"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
                        <button 
                          onClick={() => openDocDeleteModal(file)}
                          className="p-2 hover:bg-error/20 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                          title="삭제"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* Section 3: Analysis & Report History */}
      {projectDetails && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-md gap-4">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">history_edu</span>
                분석 및 보고서 이력
              </h2>
              <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">자동 생성된 테스트 케이스 시나리오 및 산출물 파일 목록</p>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center glass-panel-heavy rounded-xl px-4 py-2 w-full md:w-80">
                <span className="material-symbols-outlined text-on-surface-variant mr-3">search</span>
                <input 
                  className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant/40 outline-none text-on-background" 
                  placeholder="보고서 ID 또는 작업 단위 검색..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button
                onClick={() => navigate(`/upload-demo?projectId=${selectedProjectId}&step=2`)}
                disabled={files.length === 0}
                className="primary-gradient px-4 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 active:scale-95 transition-transform text-xs shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}
              >
                <span className="material-symbols-outlined text-xs">play_arrow</span>
                QA 검증 분석 실행
              </button>
            </div>
          </div>

          <div className="space-y-sm">
            {filteredReports.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/5 rounded-lg text-slate-500 text-sm">
                생성된 보고서 이력이 없습니다.
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.reportId} className="glass-panel p-4 rounded-xl flex items-center justify-between group">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0 flex-1">
                    <div className="font-code-md text-code-md text-primary bg-primary/10 px-3 py-1 rounded border border-primary/20 w-fit shrink-0">
                      {report.reportId}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-on-surface-variant font-label-caps shrink-0">FORMAT:</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded font-semibold border ${
                        report.reportFormat === 'PDF' 
                          ? 'bg-red-500/10 text-red-300 border-red-500/20' 
                          : 'bg-green-500/10 text-green-300 border-green-500/20'
                      }`}>
                        {report.reportFormat}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-on-surface-variant font-label-caps shrink-0">JOB ID:</span>
                      <span className="font-mono text-xs text-slate-300 truncate">{report.analysisId}</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-4">
                      <span className="text-xs text-on-surface-variant font-label-caps">ACTIONS:</span>
                      <a 
                        onClick={() => navigate(`/report-demo?reportId=${report.reportId}`)}
                        className="flex items-center gap-1.5 text-secondary hover:underline text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">preview</span> 미리보기
                      </a>
                      <a 
                        onClick={() => handleDownloadReport(report.reportId, report.reportFormat)}
                        className="flex items-center gap-1.5 text-secondary hover:underline text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">download</span> 다운로드
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0 ml-4">
                    <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                      {new Date(report.generatedAt).toLocaleString('ko-KR')}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <span className="status-dot bg-emerald-500"></span> 완료
                    </span>
                    <button 
                      onClick={async () => {
                        if (confirm('이 보고서를 영구 삭제하시겠습니까? (S3 물리 파일도 완전 삭제됩니다)')) {
                          await reportApi.delete(report.reportId);
                          fetchProjectDetails(selectedProjectId);
                        }
                      }}
                      className="text-on-surface-variant hover:text-error transition-colors p-1"
                      title="영구 파기"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Document Delete Warning Modal Overlay */}
      {isDocDeleteModalOpen && docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel-heavy rounded-2xl p-lg max-w-lg w-full mx-margin-mobile shadow-2xl border-white/20">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-3xl">warning</span>
              </div>
              <div>
                <h4 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">문서 삭제 경고</h4>
                <p className="text-on-surface-variant font-body-sm text-body-sm leading-relaxed text-slate-300">
                  이 문서를 삭제하면 연결된 모든 <span className="text-error font-bold underline">분석 작업, 테스트 케이스, 위험 요소 태그 및 물리 보고서 파일</span>이 영구적으로 소멸됩니다. 정말 삭제하시겠습니까?
                </p>
                <p className="text-xs text-slate-400 mt-2 font-mono">파일명: {docToDelete.fileName}</p>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer mb-8 group hover:bg-white/10 transition-all select-none">
              <input 
                className="w-5 h-5 rounded border-white/20 bg-transparent text-error focus:ring-error transition-all cursor-pointer" 
                type="checkbox"
                checked={docDeleteChecked}
                onChange={(e) => setDocDeleteChecked(e.target.checked)}
              />
              <span className="text-on-surface text-xs font-bold text-slate-200">위 연쇄 파기 사항을 이해했으며 동의합니다.</span>
            </label>

            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setIsDocDeleteModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-white/20 text-on-surface-variant hover:bg-white/10 transition-all font-bold text-sm text-slate-300"
              >
                취소
              </button>
              <button 
                onClick={handleDeleteDoc}
                disabled={!docDeleteChecked}
                className="px-6 py-2.5 rounded-xl bg-error text-white font-bold transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 active:scale-95"
              >
                영구 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Delete Warning Modal Overlay */}
      {isProjDeleteModalOpen && projToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-panel-heavy rounded-2xl p-lg max-w-lg w-full mx-margin-mobile shadow-2xl border-white/20">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-3xl">warning</span>
              </div>
              <div>
                <h4 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">프로젝트 영구 폐기 경고</h4>
                <p className="text-on-surface-variant font-body-sm text-body-sm leading-relaxed text-slate-300">
                  이 프로젝트를 삭제하면 프로젝트 데이터와 <span className="text-error font-bold underline">모든 연동 파일, RDB 분석 데이터, 테스트케이스, 그리고 S3 보고서 물리 파일</span>이 데이터베이스 외래키 캐스케이드에 의해 완벽히 연쇄 영구 소멸됩니다.
                </p>
                <p className="text-xs text-red-300 mt-2 font-mono">프로젝트명: {projToDelete.projectName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer group hover:bg-white/10 transition-all select-none">
                <input 
                  className="w-5 h-5 rounded border-white/20 bg-transparent text-error focus:ring-error transition-all cursor-pointer" 
                  type="checkbox"
                  checked={projDeleteChecked}
                  onChange={(e) => setProjDeleteChecked(e.target.checked)}
                />
                <span className="text-on-surface text-xs font-bold text-slate-200">위의 모든 3중 영구 파기 사항을 인지하였으며 삭제에 동의합니다.</span>
              </label>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  확인을 위해 프로젝트명 (<span className="text-slate-200 select-all font-mono">{projToDelete.projectName}</span>)을 정확히 기입해 주세요:
                </label>
                <input 
                  type="text"
                  value={projDeleteConfirmText}
                  onChange={(e) => setProjDeleteConfirmText(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-on-surface focus:ring-2 focus:ring-error/50 outline-none text-sm text-white"
                  placeholder="프로젝트명을 입력하세요"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setIsProjDeleteModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-white/20 text-on-surface-variant hover:bg-white/10 transition-all font-bold text-sm text-slate-300"
              >
                취소
              </button>
              <button 
                onClick={handleDeleteProj}
                disabled={!projDeleteChecked || projDeleteConfirmText !== projToDelete.projectName}
                className="px-6 py-2.5 rounded-xl bg-error text-white font-bold transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 active:scale-95"
              >
                프로젝트 파기 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
