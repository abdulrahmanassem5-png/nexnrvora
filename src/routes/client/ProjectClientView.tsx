import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Project, ProjectFile, Contract } from '../../types';
import { ProjectStatusTracker } from '../../components/client/ProjectStatusTracker';
import { ChatBox } from '../../components/shared/ChatBox';
import { TestimonialForm } from '../../components/client/TestimonialForm';

export default function ProjectClientView() {
  const { projectId } = useParams();
  const { userData } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      return;
    }

    if (!userData.freelancerId || !projectId) {
      setLoading(false);
      setError('بيانات المشروع غير متاحة.');
      return;
    }

    const fetchProjectAndFiles = async () => {
      try {
        const projRef = doc(db, `freelancers/${userData.freelancerId}/projects/${projectId}`);
        const projSnap = await getDoc(projRef);
        
        if (projSnap.exists()) {
          setProject({ id: projSnap.id, ...projSnap.data() } as Project);
        } else {
          setError('المشروع غير موجود.');
          setLoading(false);
          return;
        }

        const filesQuery = query(collection(db, `freelancers/${userData.freelancerId}/projects/${projectId}/files`));
        const filesSnap = await getDocs(filesQuery);
        setFiles(filesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ProjectFile[]);

        const contractsQuery = query(collection(db, `freelancers/${userData.freelancerId}/contracts`));
        const contractsSnap = await getDocs(contractsQuery);
        const allContracts = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Contract[];
        // Filter for this project AND only show sent or signed contracts (hide drafts)
        setContracts(allContracts.filter(c => c.projectId === projectId && c.status !== 'draft'));
      } catch (err) {
        console.error("Error fetching project:", err);
        setError('حدث خطأ أثناء تحميل بيانات المشروع.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndFiles();
  }, [userData, projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">جاري تحميل المشروع...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to="/portal" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&rarr; العودة للقائمة</Link>
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

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to="/portal" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&rarr; العودة للقائمة</Link>
        <div className="bg-red-50 p-8 rounded-xl border border-red-200 text-center text-red-500">
          عذراً، المشروع غير موجود أو لا تملك صلاحية للوصول إليه.
        </div>
      </div>
    );
  }

  const formatDate = (date: any) => {
    if (!date) return '';
    const jsDate = date.toDate ? date.toDate() : new Date(date);
    return new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(
      Math.ceil((jsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/portal" className="text-blue-600 hover:underline text-sm mb-4 inline-block">&rarr; العودة للقائمة</Link>
      
      <div className="bg-slate-900 p-6 md:p-8 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-800">{project.title}</h2>
        <p className="text-gray-600 mb-6 text-lg">{project.description}</p>
        
        <div className="py-8 px-4 border-t border-b border-gray-100 my-8">
          <ProjectStatusTracker status={project.status} />
        </div>
        
        <div className="text-sm text-gray-500 text-left" dir="ltr">
          آخر تحديث: {formatDate(project.updatedAt)}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4">ملفات المشروع</h3>
        {files.length === 0 ? (
          <div className="bg-slate-900 p-8 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border text-center text-gray-500">
            لم يتم رفع أي ملفات حتى الآن.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map(file => (
              <div key={file.id} className="bg-slate-900 p-5 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border flex justify-between items-center hover:shadow-xl shadow-indigo-500/10 transition-shadow">
                <span className="font-medium text-gray-800 break-all ml-4">{file.name}</span>
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="shrink-0 bg-blue-500/10 text-blue-400 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  تحميل
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contracts Section for Client */}
      {contracts.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">عقود المشروع</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map(contract => (
              <Link 
                key={contract.id} 
                to={`/portal/projects/${projectId}/contract/${contract.id}`}
                className="bg-slate-900 p-5 rounded-xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border flex justify-between items-center hover:shadow-xl shadow-indigo-500/10 hover:border-indigo-400 transition-all group"
              >
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-1">{contract.title}</h4>
                  <span className={`font-bold px-2 py-1 rounded text-xs inline-block \${contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                    {contract.status === 'signed' ? 'مُوقّع' : 'بانتظار توقيعك'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {project.status === 'delivered' && (
        <TestimonialForm project={project} freelancerId={userData.freelancerId!} />
      )}

      <div className="mt-12">
        <h3 className="text-xl font-bold mb-4">مساحة النقاش</h3>
        <ChatBox projectId={projectId!} freelancerId={userData.freelancerId!} />
      </div>
    </div>
  );
}

