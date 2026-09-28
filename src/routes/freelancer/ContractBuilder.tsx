import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Contract, Project, Client } from '../../types';
import { motion } from 'framer-motion';

export default function ContractBuilder() {
  const { projectId, contractId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(!contractId);
  
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [contract, setContract] = useState<Partial<Contract>>({
    title: 'عقد تقديم خدمات مستقلة',
    terms: '1. النطاق الزمني: يلتزم المستقل بتسليم المشروع خلال المدة المتفق عليها.\n2. التعديلات: يحق للعميل طلب تعديلين (2) مجاناً بعد التسليم الأولي.\n3. الدفع: يلتزم العميل بدفع القيمة المتفق عليها قبل تسليم الملفات النهائية (أو حسب الاتفاق).\n4. السرية: يلتزم المستقل بالحفاظ على سرية معلومات العميل وعدم مشاركتها.',
    value: 0,
    status: 'draft',
  });

  useEffect(() => {
    if (!currentUser || !projectId) return;

    const fetchData = async () => {
      try {
        const pSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`));
        if (pSnap.exists()) {
          const p = pSnap.data() as Project;
          setProject({ ...p, id: pSnap.id } as Project);
          
          const cSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/clients/${p.clientId}`));
          if (cSnap.exists()) {
            setClient({ id: cSnap.id, ...cSnap.data() } as Client);
          }
        }

        if (contractId) {
          const cSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/contracts/${contractId}`));
          if (cSnap.exists()) {
            setContract(cSnap.data() as Contract);
            setIsNew(false);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, projectId, contractId]);

  const handleSave = async () => {
    if (!currentUser || !project || !client) return;
    setSaving(true);
    
    try {
      const targetId = contractId || doc(collection(db, 'temp')).id;
      
      const payload: Contract = {
        projectId: project.id,
        clientId: client.id,
        title: contract.title!,
        terms: contract.terms!,
        value: contract.value || 0,
        status: contract.status as any,
        createdAt: isNew ? serverTimestamp() : contract.createdAt,
      };

      await setDoc(doc(db, `freelancers/${currentUser.uid}/contracts/${targetId}`), payload, { merge: true });
      
      if (isNew) {
        navigate(`/app/projects/${projectId}/contract/${targetId}`, { replace: true });
      } else {
        alert("تم حفظ العقد بنجاح!");
      }
    } catch (error) {
      console.error("Error saving contract:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8 items-start"
    >
      
      {/* Controls Sidebar */}
      <div className="w-full xl:w-96 bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-800/60 sticky top-8 shrink-0">
        <h3 className="text-xl font-black text-slate-50 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          إعدادات العقد
        </h3>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">عنوان العقد</label>
            <input 
              className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-50 transition-colors" 
              value={contract.title}
              onChange={e => setContract(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">قيمة العقد ($)</label>
            <input 
              type="number"
              className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-50 transition-colors" 
              value={contract.value}
              onChange={e => setContract(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">حالة العقد</label>
            <select 
              className="w-full p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-50 cursor-pointer transition-colors" 
              value={contract.status}
              onChange={e => setContract(prev => ({ ...prev, status: e.target.value as any }))}
              disabled={contract.status === 'signed'} // cannot change if already signed
            >
              <option value="draft">مسودة</option>
              <option value="sent">تم الإرسال للعميل</option>
              <option value="signed">مُوقّع</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">شروط وبنود العقد</label>
            <textarea 
              rows={12}
              className="w-full p-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-50 leading-relaxed transition-colors resize-none" 
              value={contract.terms}
              onChange={e => setContract(prev => ({ ...prev, terms: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 rounded-xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ العقد'}
          </button>
        </div>
      </div>

      {/* Visual Contract Preview Area */}
      <div className="flex-1 overflow-x-auto pb-10">
        <div className="min-w-[800px] max-w-[800px] mx-auto bg-slate-50 shadow-2xl rounded-lg p-10 lg:p-14 border border-slate-200 relative overflow-hidden">
          
          {/* Watermark */}
          {contract.status === 'signed' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-emerald-500/10 font-black text-9xl pointer-events-none whitespace-nowrap">
              مُوقّع رسمياً
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-12 border-b-2 border-slate-200 pb-8 relative z-10">
            <h1 className="text-4xl font-black text-slate-900 mb-4">{contract.title}</h1>
            <p className="text-slate-500 font-medium">بين الطرفين: المستقل والعميل</p>
          </div>

          {/* Details */}
          <div className="flex justify-between mb-12 bg-slate-100 p-6 rounded-2xl relative z-10">
            <div>
              <h3 className="text-sm font-bold text-slate-500 mb-1">الطرف الأول (المستقل)</h3>
              <p className="text-xl font-black text-slate-900">{currentUser?.displayName}</p>
              <p className="text-slate-600">{currentUser?.email}</p>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-500 mb-1">الطرف الثاني (العميل)</h3>
              <p className="text-xl font-black text-slate-900">{client?.name}</p>
              <p className="text-slate-600">{client?.email}</p>
            </div>
          </div>

          {/* Project Info */}
          <div className="mb-10 relative z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-2 border-b-2 border-slate-200 pb-2 inline-block">تفاصيل المشروع</h3>
            <div className="mt-4">
              <p className="text-slate-700 font-medium"><span className="font-bold">المشروع:</span> {project?.title}</p>
              <p className="text-slate-700 font-medium mt-2"><span className="font-bold">القيمة المتفق عليها:</span> <span className="text-emerald-600 font-black text-xl">${contract.value}</span></p>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-16 relative z-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b-2 border-slate-200 pb-2 inline-block">البنود والشروط</h3>
            <div className="text-slate-700 leading-loose whitespace-pre-wrap font-medium">
              {contract.terms}
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end border-t-2 border-slate-200 pt-12 relative z-10">
            <div className="w-1/3">
              <h3 className="text-sm font-bold text-slate-500 mb-4 text-center">توقيع الطرف الأول</h3>
              <div className="border-b-2 border-dashed border-slate-400 pb-2 text-center text-slate-900 font-black font-serif italic text-2xl">
                {currentUser?.displayName}
              </div>
            </div>
            <div className="w-1/3">
              <h3 className="text-sm font-bold text-slate-500 mb-4 text-center">توقيع الطرف الثاني</h3>
              <div className="border-b-2 border-dashed border-slate-400 h-10 relative">
                {contract.status === 'signed' && (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-600 font-black font-serif italic text-2xl -rotate-12">
                    {contract.clientSignature || client?.name}
                  </div>
                )}
              </div>
              {contract.status === 'signed' && contract.signedAt && (
                <p className="text-center mt-2 text-xs text-slate-500 font-bold">
                  تم التوقيع إلكترونياً: {new Date((contract.signedAt as any).toDate?.() || contract.signedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          
        </div>
      </div>
      
    </motion.div>
  );
}
