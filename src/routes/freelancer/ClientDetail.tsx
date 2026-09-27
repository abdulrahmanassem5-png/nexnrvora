import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Client, Project } from '../../types';
import { StatusBadge } from '../../components/freelancer/StatusBadge';

export default function ClientDetail() {
  const { clientId } = useParams();
  const { currentUser } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddProject, setShowAddProject] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!currentUser || !clientId) return;

    const fetchData = async () => {
      try {
        const clientSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/clients/${clientId}`));
        if (clientSnap.exists()) {
          const clientData = clientSnap.data() as Client;
          setClient({ id: clientSnap.id, ...clientData });
          if (clientData.notes) setNotes(clientData.notes);
        }

        const q = query(collection(db, `freelancers/${currentUser.uid}/projects`));
        const projectsSnap = await getDocs(q);
        
        const allProjects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
        setProjects(allProjects.filter(p => p.clientId === clientId));
        
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, clientId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !clientId) return;

    try {
      const docRef = await addDoc(collection(db, `freelancers/${currentUser.uid}/projects`), {
        clientId,
        title: newTitle,
        description: newDesc,
        status: 'in_progress',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProjects(prev => [...prev, {
        id: docRef.id,
        clientId,
        title: newTitle,
        description: newDesc,
        status: 'in_progress',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      setNewTitle('');
      setNewDesc('');
      setShowAddProject(false);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!client) return (
    <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-dashed border-red-300">
      <h3 className="text-xl font-bold text-red-600 mb-2">العميل غير موجود</h3>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-10">
        <Link to="/app/clients" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-400 font-semibold text-sm mb-6 bg-indigo-500/10 px-4 py-2 rounded-full transition-colors">
          &rarr; العودة لقائمة العملاء
        </Link>
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-50 mb-2">{client.name}</h2>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {client.email}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${client.clientUserId ? 'bg-emerald-500/10 text-emerald-400 border-emerald-200' : 'bg-amber-500/10 text-amber-400 border-amber-200'}`}>
                {client.clientUserId ? 'نشط في البوابة' : 'غير مسجل'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800/60 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black text-slate-50">ملاحظات العميل</h3>
          <button 
            onClick={async () => {
              if (!currentUser || !clientId) return;
              setSavingNotes(true);
              try {
                await updateDoc(doc(db, `freelancers/${currentUser.uid}/clients/${clientId}`), { notes });
              } catch (e) {
                console.error("Error saving notes", e);
              } finally {
                setSavingNotes(false);
              }
            }}
            disabled={savingNotes}
            className="text-indigo-400 font-bold hover:bg-indigo-500/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {savingNotes ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
        <textarea
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium resize-none text-slate-200"
          rows={4}
          placeholder="سجل ملاحظاتك واجتماعاتك مع العميل هنا..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-black text-slate-50">مشاريع العميل</h3>
        <button 
          onClick={() => setShowAddProject(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl shadow-indigo-500/10 shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          مشروع جديد
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-slate-400 mb-4 font-medium">لا توجد مشاريع لهذا العميل حتى الآن.</p>
          <button 
            onClick={() => setShowAddProject(true)}
            className="text-indigo-400 font-bold hover:bg-indigo-500/10 px-6 py-2 rounded-full transition-colors"
          >
            إنشاء أول مشروع
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Link 
              key={project.id} 
              to={`/app/projects/${project.id}`}
              className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 hover:shadow-2xl shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 block group"
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-lg text-slate-50 group-hover:text-indigo-400 transition-colors line-clamp-1">{project.title}</h4>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-4">{project.description}</p>
              <div className="pt-4 border-t border-slate-800 flex justify-end items-center text-xs text-slate-400 font-medium">
                <span className="text-indigo-400 group-hover:translate-x-1 transition-transform inline-block opacity-0 group-hover:opacity-100">&larr; إدارة المشروع</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-indigo-600/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-50 mb-6">مشروع جديد</h3>
            <form onSubmit={handleCreateProject} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">اسم المشروع</label>
                <input
                  type="text"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="مثال: تصميم شعار جديد"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">تفاصيل المشروع</label>
                <textarea
                  required
                  rows={4}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="وصف مختصر لمتطلبات المشروع..."
                />
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowAddProject(false)}
                  className="px-5 py-2.5 text-slate-300 font-bold hover:bg-slate-800 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors"
                >
                  إنشاء المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
