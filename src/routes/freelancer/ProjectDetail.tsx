import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Project, ProjectFile, Invoice, Contract, User } from '../../types';
import { sendEmailNotification } from '../../lib/email';
import { FileUploadZone } from '../../components/freelancer/FileUploadZone';
import { StatusBadge } from '../../components/freelancer/StatusBadge';
import { KanbanBoard } from '../../components/freelancer/KanbanBoard';
import { AIAssistant } from '../../components/freelancer/AIAssistant';
import { ChatBox } from '../../components/shared/ChatBox';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { currentUser } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchProjectAndFiles = async () => {
    if (!currentUser || !projectId) return;
    try {
      const projSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`));
      if (projSnap.exists()) {
        const p = { id: projSnap.id, ...projSnap.data() } as Project;
        setProject(p);
        setEditTitle(p.title);
        setEditDesc(p.description);
      }

      const filesQ = query(collection(db, `freelancers/${currentUser.uid}/projects/${projectId}/files`));
      const filesSnap = await getDocs(filesQ);
      setFiles(filesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ProjectFile[]);
      
      const invQ = query(collection(db, `freelancers/${currentUser.uid}/invoices`));
      const invSnap = await getDocs(invQ);
      const allInv = invSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Invoice[];
      setInvoices(allInv.filter(i => i.projectId === projectId));

      const contractQ = query(collection(db, `freelancers/${currentUser.uid}/contracts`));
      const contractSnap = await getDocs(contractQ);
      const allContracts = contractSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Contract[];
      setContracts(allContracts.filter(c => c.projectId === projectId));
      
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndFiles();
  }, [currentUser, projectId]);

  const handleUpdateProject = async () => {
    if (!currentUser || !projectId) return;
    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`), {
        title: editTitle,
        description: editDesc,
        updatedAt: serverTimestamp()
      });
      setProject(prev => prev ? { ...prev, title: editTitle, description: editDesc } : null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating project", error);
    }
  };

  const handleStatusChange = async (newStatus: 'in_progress' | 'in_review' | 'delivered') => {
    if (!currentUser || !projectId || !project) return;
    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setProject(prev => prev ? { ...prev, status: newStatus } : null);

      // Fetch client info and send email
      if (project.clientId) {
        const clientSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/clients/${project.clientId}`));
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          if (clientData.email) {
            const statusArabic = newStatus === 'in_progress' ? 'قيد التنفيذ' : newStatus === 'in_review' ? 'في المراجعة' : 'تم التسليم';
            await sendEmailNotification({
              to_email: clientData.email,
              to_name: clientData.name || 'العميل',
              from_name: currentUser.displayName || 'المستقل',
              message: `تم تحديث حالة مشروعك "${project.title}" إلى: ${statusArabic}`,
              subject: 'تحديث في حالة المشروع - منصة NEXNRVORA',
              action_url: `${window.location.origin}/portal/projects/${projectId}`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const handleDeleteFile = async (file: ProjectFile) => {
    if (!currentUser || !projectId || !window.confirm('هل أنت متأكد من حذف الملف؟')) return;
    try {
      await deleteDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}/files/${file.id}`));
      const fileRef = ref(storage, file.storagePath || `freelancers/${currentUser.uid}/projects/${projectId}/${file.name}`);
      await deleteObject(fileRef);
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error) {
      console.error("Error deleting file", error);
    }
  };

  const handleToggleReviewPublic = async () => {
    if (!currentUser || !projectId || !project || !project.review) return;
    const newIsPublic = !project.review.isPublic;
    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`), {
        'review.isPublic': newIsPublic
      });
      setProject(prev => prev ? { ...prev, review: { ...prev.review!, isPublic: newIsPublic } } : null);
    } catch (error) {
      console.error("Error updating review visibility:", error);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!project) return (
    <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-dashed border-red-300">
      <h3 className="text-xl font-bold text-red-600 mb-2">المشروع غير موجود</h3>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link to={`/app/clients/${project.clientId}`} className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-400 font-semibold text-sm mb-6 bg-indigo-500/10 px-4 py-2 rounded-full transition-colors">
          &rarr; العودة لمشاريع العميل
        </Link>
        
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            {isEditing ? (
              <div className="w-full lg:w-2/3 space-y-4">
                <input 
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xl transition-all" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                />
                <textarea 
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" 
                  rows={4} 
                  value={editDesc} 
                  onChange={e => setEditDesc(e.target.value)} 
                />
                <div className="flex gap-3">
                  <button onClick={handleUpdateProject} className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors">حفظ التعديلات</button>
                  <button onClick={() => setIsEditing(false)} className="bg-slate-800 text-slate-200 font-bold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="w-full lg:w-2/3">
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-3xl font-black text-slate-50">{project.title}</h2>
                  <button onClick={() => setIsEditing(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed">{project.description}</p>
              </div>
            )}
            
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shrink-0 min-w-[200px]">
              <label className="block text-sm font-bold text-slate-200 mb-3">حالة المشروع الحالية</label>
              <div className="mb-4">
                <StatusBadge status={project.status} />
              </div>
              <select 
                className="w-full border border-slate-700 p-2.5 rounded-xl bg-slate-900 text-sm font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-shadow"
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
              >
                <option value="in_progress">جاري التنفيذ</option>
                <option value="in_review">في المراجعة</option>
                <option value="delivered">تم التسليم</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-50">فواتير المشروع</h3>
          </div>
          <Link 
            to={`/app/projects/${projectId}/invoice`}
            className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء فاتورة
          </Link>
        </div>
        
        {invoices.length === 0 ? (
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800/60 text-center text-slate-400 font-medium">
            لا توجد فواتير مرتبطة بهذا المشروع.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map(inv => (
              <Link 
                key={inv.id} 
                to={`/app/projects/${projectId}/invoice/${inv.id}`}
                className="bg-slate-900 p-5 rounded-2xl border border-slate-800/60 hover:shadow-xl shadow-indigo-500/10 hover:border-emerald-200 transition-all group flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-50">{inv.invoiceNumber}</span>
                  <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded text-sm">${inv.total.toFixed(2)}</span>
                </div>
                <div className="text-sm text-slate-400 font-medium">
                  {inv.issueDate ? new Date((inv.issueDate as any).toDate?.() || inv.issueDate).toLocaleDateString('ar-EG') : '-'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Contracts Section */}
      <div className="mb-8 pt-8 border-t border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-50">عقود المشروع</h3>
          </div>
          <Link 
            to={`/app/projects/${projectId}/contract`}
            className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            إنشاء عقد جديد
          </Link>
        </div>
        
        {contracts.length === 0 ? (
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800/60 text-center text-slate-400 font-medium">
            لا توجد عقود مرتبطة بهذا المشروع.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contracts.map(contract => (
              <Link 
                key={contract.id} 
                to={`/app/projects/${projectId}/contract/${contract.id}`}
                className="bg-slate-900 p-5 rounded-2xl border border-slate-800/60 hover:shadow-xl shadow-indigo-500/10 hover:border-indigo-400 transition-all group flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-50 line-clamp-1">{contract.title}</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                    {contract.status === 'signed' ? 'مُوقّع' : contract.status === 'sent' ? 'بانتظار التوقيع' : 'مسودة'}
                  </span>
                </div>
                <div className="text-sm text-slate-400 font-medium">
                  {contract.createdAt ? new Date((contract.createdAt as any).toDate?.() || contract.createdAt).toLocaleDateString('ar-EG') : '-'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-50">الملفات المرفوعة</h3>
          </div>

          {files.length === 0 ? (
            <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800/60 text-center text-slate-400">
              لا توجد ملفات مرفوعة في هذا المشروع بعد.
            </div>
          ) : (
            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800/60 flex justify-between items-center group hover:border-indigo-200 hover:shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-200 truncate">{file.name}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-2 text-indigo-400 bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button onClick={() => handleDeleteFile(file)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-black text-slate-50 mb-4">رفع ملف جديد</h3>
          <FileUploadZone projectId={projectId!} onUploadSuccess={fetchProjectAndFiles} />
        </div>
      </div>

      <div className="mt-12 mb-8 pt-12 border-t border-slate-800">
        <KanbanBoard projectId={projectId!} />
      </div>

      {/* Chat Section */}
      <div className="mt-12 mb-8 pt-12 border-t border-slate-800">
        <h3 className="text-2xl font-black text-slate-50 mb-6">مساحة النقاش والتواصل</h3>
        <ChatBox projectId={projectId!} freelancerId={currentUser!.uid} />
      </div>

      {/* Testimonial Section */}
      {project.review && (
        <div className="mt-12 mb-8 pt-12 border-t border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-50">تقييم العميل</h3>
            <button
              onClick={handleToggleReviewPublic}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                project.review.isPublic 
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {project.review.isPublic ? 'إخفاء من معرض الأعمال' : 'نشر في معرض الأعمال'}
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className={`w-6 h-6 ${project.review!.rating >= star ? 'text-yellow-500' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            <p className="text-lg text-slate-300 italic leading-relaxed">
              "{project.review.text}"
            </p>
          </div>
        </div>
      )}

      {project && <AIAssistant project={project} />}
    </div>
  );
}
