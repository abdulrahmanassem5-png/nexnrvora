import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Project } from '../../types';
import ProjectClientView from './ProjectClientView';
import ContractSignView from './ContractSignView';
import { StatusBadge } from '../../components/freelancer/StatusBadge';

function ClientProjectsList() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }
    
    if (!userData.freelancerId || !userData.clientId) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      try {
        // Try the query with where clause first
        const q = query(
          collection(db, `freelancers/${userData.freelancerId}/projects`),
          where('clientId', '==', userData.clientId)
        );
        const querySnapshot = await getDocs(q);
        const projectsData = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Project[];
        
        if (projectsData.length === 1) {
          navigate(`/portal/projects/${projectsData[0].id}`, { replace: true });
          return; // Don't set loading to false — we're navigating away
        }
        
        setProjects(projectsData);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError('حدث خطأ أثناء تحميل المشاريع. حاول مرة أخرى.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [userData, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">جاري تحميل المشاريع...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 p-8 rounded-xl border border-red-200 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">مشاريعك</h2>
      
      {projects.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border text-center text-gray-500">
          لا يوجد مشاريع مرتبطة بحسابك حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(project => (
            <Link 
              key={project.id} 
              to={`/portal/projects/${project.id}`}
              className="bg-slate-900 p-6 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border hover:shadow-xl shadow-indigo-500/10 transition-shadow block"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{project.title}</h3>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-gray-500 text-sm line-clamp-2">{project.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Portal() {
  const { logout, userData } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-slate-900 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 p-4 flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold text-blue-600">بوابة العميل</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{userData?.displayName}</span>
          <button 
            onClick={logout}
            className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>
      
      <main className="px-4 sm:px-6 lg:px-8 pb-12">
        <Routes>
          <Route index element={<ClientProjectsList />} />
          <Route path="projects/:projectId" element={<ProjectClientView />} />
          <Route path="projects/:projectId/contract/:contractId" element={<ContractSignView />} />
        </Routes>
      </main>
    </div>
  );
}
