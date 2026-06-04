import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Real Page Components
import { DashboardPage } from './pages/DashboardPage';
import { ProjectSetupPage } from './pages/ProjectSetupPage';
import { DocumentUploadPage } from './pages/DocumentUploadPage';
import { AnalysisResultPage } from './pages/AnalysisResultPage';
import { ReportPreviewPage } from './pages/ReportPreviewPage';

const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isReportPage = location.pathname === '/report-demo';

  if (isReportPage) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col" style={{ background: 'linear-gradient(135deg, #0F0F1A 0%, #151528 100%)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden" style={{ background: 'radial-gradient(circle at top left, #0F0F1A, #151528)' }}>
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-desktop py-sm bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-primary/10">
        <div className="flex items-center gap-4">
          <span 
            onClick={() => navigate('/dashboard')}
            className="cursor-pointer font-headline-lg text-headline-lg font-bold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent select-none"
          >
            Yonam Tester
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8 font-body-md text-body-md">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => isActive ? "text-primary border-b-2 border-primary pb-1" : "text-on-surface-variant hover:text-on-surface transition-colors"}
            >
              Dashboard
            </NavLink>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onClick={() => alert('Documentation는 준비 중입니다.')}>Documentation</a>
            <a className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" onClick={() => alert('이메일 support@yeonam-tech.com으로 문의해주세요.')}>Support</a>
          </div>
          
          <button 
            onClick={() => navigate('/setup')}
            className="primary-gradient px-6 py-2 rounded-xl text-white font-bold flex items-center gap-2 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(45deg, #6366f1, #8b5cf6)' }}
          >
            <span className="material-symbols-outlined">add_circle</span>
            새 프로젝트 생성
          </button>
          
          <div className="flex items-center gap-3">
            <button className="text-on-surface-variant hover:bg-white/5 p-2 rounded-full transition-all">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:bg-white/5 p-2 rounded-full transition-all">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden">
              <img 
                alt="User profile avatar" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqPiAA97dMqKeb6WL5vZPZHnnPM9RaAtdR0y-w4zYobDWK3wHj1MNE07CowkOcnU2nN6iY3iuqZZNHs0dwpWlg5Iye3gae9QI43pcrWhmtWJpa9uJouS5YA5G1HtZFCe1pzarG_hBREbkccxR2aryIDZuqct53Tk5RsS-BmmYorF__0lPIyMhRyC1rwFWhJUWKzqXCBu9QAEj-t6_NDYn4TEthQ2jdEMiiUteV5W5YzAzhLtD9e8gKdbkb_vrLGA4wVpN4kAKzOak"
              />
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full flex flex-col pt-24 pb-8 bg-surface-container-low/40 backdrop-blur-2xl border-r border-white/10 w-64 hidden md:flex">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-secondary">terminal</span>
            <span className="font-label-caps text-label-caps text-secondary font-bold">QA TERMINAL</span>
          </div>
          <p className="font-code-md text-code-md text-on-surface-variant opacity-60">v2.4.0-stable</p>
        </div>
        
        <nav className="flex-1 flex flex-col px-4 gap-2">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => 
              isActive 
                ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-tertiary/20 text-primary border-r-2 border-primary transition-transform hover:translate-x-1" 
                : "flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/10 transition-all"
            }
          >
            <span className="material-symbols-outlined">folder</span>
            <span className="font-code-md text-code-md font-medium">Projects</span>
          </NavLink>
          
          <NavLink 
            to="/upload-demo" 
            className={({ isActive }) => 
              isActive 
                ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-tertiary/20 text-primary border-r-2 border-primary transition-transform hover:translate-x-1" 
                : "flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/10 transition-all"
            }
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-code-md text-code-md font-medium">Documentation</span>
          </NavLink>
          
          <NavLink 
            to="/report-demo" 
            className={({ isActive }) => 
              isActive 
                ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-tertiary/20 text-primary border-r-2 border-primary transition-transform hover:translate-x-1" 
                : "flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/10 transition-all"
            }
          >
            <span className="material-symbols-outlined">assessment</span>
            <span className="font-code-md text-code-md font-medium">Reports</span>
          </NavLink>

          <a 
            onClick={() => alert('API Key 관리는 준비 중입니다.')} 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/10 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">vpn_key</span>
            <span className="font-code-md text-code-md font-medium">API Keys</span>
          </a>
        </nav>
        
        <div className="px-4 flex flex-col gap-2">
          <button 
            onClick={() => alert('Premium 플랜 구독 준비 중입니다.')} 
            className="w-full py-3 mb-4 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all"
          >
            Upgrade Plan
          </button>
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-on-surface cursor-pointer" onClick={() => alert('support@yeonam-tech.com으로 문의바랍니다.')}>
            <span className="material-symbols-outlined">help</span>
            <span className="font-code-md text-code-md">Support</span>
          </a>
          <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-red-400 cursor-pointer" onClick={() => alert('데모 환경이므로 로그아웃할 수 없습니다.')}>
            <span className="material-symbols-outlined">logout</span>
            <span className="font-code-md text-code-md">Logout</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:pl-64 pt-32 pb-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop space-y-lg">
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <NavigationWrapper>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/setup" element={<ProjectSetupPage />} />
          <Route path="/upload-demo" element={<DocumentUploadPage />} />
          <Route path="/analysis-demo" element={<AnalysisResultPage />} />
          <Route path="/report-demo" element={<ReportPreviewPage />} />
        </Routes>
      </NavigationWrapper>
    </Router>
  );
};


export default App;
