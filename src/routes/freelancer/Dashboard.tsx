import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Overview from './Overview';
import ClientsList from './ClientsList';
import ClientDetail from './ClientDetail';
import ProjectDetail from './ProjectDetail';
import Financials from './Financials';
import InvoiceBuilder from './InvoiceBuilder';
import ContractBuilder from './ContractBuilder';
import CRM from './CRM';
import PortfolioSettings from './PortfolioSettings';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsBadge } from '../../components/freelancer/NotificationsBadge';
import { MarketingBot } from '../../components/public/MarketingBot';

export default function Dashboard() {
  const { logout, userData } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/app' && location.pathname === '/app') return true;
    if (path !== '/app' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) => `
    flex items-center gap-3 p-3.5 rounded-2xl font-bold transition-all duration-300
    ${isActive(path) 
      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/10 shadow-indigo-200' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50'
    }
  `;

  return (
    <div className="flex h-screen bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar - Desktop */}
      <aside className="w-72 bg-slate-900 border-l border-slate-800/60 hidden lg:flex flex-col z-20">
        <div className="p-8">
          <div className="text-3xl font-black bg-gradient-to-l from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-10 text-center uppercase tracking-wider">
            NEXNRVORA
          </div>
          <nav className="space-y-2">
            <Link to="/app" className={navLinkClass('/app')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              الرئيسية
            </Link>
            <Link to="/app/crm" className={navLinkClass('/app/crm')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              العملاء المحتملين
            </Link>
            <Link to="/app/clients" className={navLinkClass('/app/clients')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              عملائي الحاليين
            </Link>
            <Link to="/app/financials" className={navLinkClass('/app/financials')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              المالية
            </Link>
            <Link to="/app/portfolio" className={navLinkClass('/app/portfolio')}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              معرض الأعمال
            </Link>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl mb-4">
            <div>
              <p className="text-sm font-bold text-slate-50 line-clamp-1">{userData?.displayName}</p>
              <p className="text-xs text-slate-400 line-clamp-1 mt-1">{userData?.email}</p>
            </div>
            <NotificationsBadge />
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 p-4 flex justify-between items-center z-10 sticky top-0">
          <div className="text-xl font-black text-indigo-400 uppercase tracking-wider">NEXNRVORA</div>
          <div className="flex items-center gap-3">
            <NotificationsBadge />
            <span className="text-sm font-bold text-slate-200">{userData?.displayName?.split(' ')[0]}</span>
            <button onClick={logout} className="p-2 text-red-600 bg-red-50 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
          <div className="relative z-10">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="clients" element={<ClientsList />} />
              <Route path="clients/:clientId" element={<ClientDetail />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="financials" element={<Financials />} />
              <Route path="crm" element={<CRM />} />
              <Route path="portfolio" element={<PortfolioSettings />} />
              <Route path="projects/:projectId/contract" element={<ContractBuilder />} />
              <Route path="projects/:projectId/contract/:contractId" element={<ContractBuilder />} />
              <Route path="projects/:projectId/invoice" element={<InvoiceBuilder />} />
              <Route path="projects/:projectId/invoice/:invoiceId" element={<InvoiceBuilder />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* AI Marketing Assistant Floating Widget */}
      <MarketingBot />
    </div>
  );
}
