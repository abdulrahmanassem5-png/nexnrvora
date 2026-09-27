import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Contract, Project, Client } from '../../types';
import { motion } from 'framer-motion';

export default function ContractSignView() {
  const { projectId, contractId } = useParams();
  const { userData } = useAuth();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [freelancerData, setFreelancerData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userData || !userData.freelancerId || !projectId || !contractId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const cRef = doc(db, `freelancers/${userData.freelancerId}/contracts/${contractId}`);
        const cSnap = await getDoc(cRef);
        if (cSnap.exists()) {
          const cData = { id: cSnap.id, ...cSnap.data() } as Contract;
          // Security check: only show if sent or signed
          if (cData.status === 'draft') {
            setError('هذا العقد غير متاح بعد.');
            setLoading(false);
            return;
          }
          setContract(cData);
        } else {
          setError('العقد غير موجود.');
          setLoading(false);
          return;
        }

        const pSnap = await getDoc(doc(db, `freelancers/${userData.freelancerId}/projects/${projectId}`));
        if (pSnap.exists()) setProject({ id: pSnap.id, ...pSnap.data() } as Project);

        const clSnap = await getDoc(doc(db, `freelancers/${userData.freelancerId}/clients/${userData.clientId}`));
        if (clSnap.exists()) setClient({ id: clSnap.id, ...clSnap.data() } as Client);

        const fSnap = await getDoc(doc(db, `users/${userData.freelancerId}`));
        if (fSnap.exists()) setFreelancerData(fSnap.data());

      } catch (err) {
        console.error("Error fetching contract:", err);
        setError('حدث خطأ أثناء تحميل العقد.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData, projectId, contractId]);

  const handleSign = async () => {
    if (!userData || !userData.freelancerId || !contractId || !client) return;
    
    if (!window.confirm("بالضغط على موافق، أنت توافق إلكترونياً على جميع بنود وشروط هذا العقد وتلتزم بها.")) {
      return;
    }

    setSigning(true);
    try {
      await updateDoc(doc(db, `freelancers/${userData.freelancerId}/contracts/${contractId}`), {
        status: 'signed',
        signedAt: serverTimestamp(),
        clientSignature: client.name
      });
      
      setContract(prev => prev ? { 
        ...prev, 
        status: 'signed', 
        signedAt: new Date(),
        clientSignature: client.name 
      } : null);
      
      // Optionally show confetti here if framer-motion supports it or just an alert
    } catch (err) {
      console.error("Error signing contract:", err);
      alert("حدث خطأ أثناء التوقيع. حاول مرة أخرى.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">جاري تحميل العقد...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link to={`/portal/projects/${projectId}`} className="text-indigo-600 hover:underline text-sm mb-4 inline-block">&rarr; العودة للمشروع</Link>
        <div className="bg-red-50 p-8 rounded-xl border border-red-200 text-center">
          <p className="text-red-600 mb-4">{error || 'العقد غير موجود.'}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-20"
    >
      <Link to={`/portal/projects/${projectId}`} className="text-indigo-600 hover:underline font-bold text-sm mb-6 inline-block">&rarr; العودة للمشروع</Link>
      
      <div className="bg-slate-900 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 rounded-2xl p-8 lg:p-14 border border-slate-800 relative overflow-hidden text-slate-100">
        
        {contract.status === 'signed' && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-emerald-500/10 font-black text-9xl pointer-events-none whitespace-nowrap z-0"
          >
            مُوقّع رسمياً
          </motion.div>
        )}

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-12 border-b-2 border-slate-800 pb-8">
            <h1 className="text-3xl lg:text-4xl font-black text-white mb-4">{contract.title}</h1>
            <p className="text-indigo-400 font-bold tracking-wider">وثيقة رسمية</p>
          </div>

          {/* Details */}
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-12 bg-slate-950 p-6 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-500 mb-1">الطرف الأول (المستقل)</h3>
              <p className="text-xl font-black text-white">{freelancerData?.displayName}</p>
              <p className="text-slate-400 text-sm mt-1">{freelancerData?.email}</p>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-500 mb-1">الطرف الثاني (العميل)</h3>
              <p className="text-xl font-black text-white">{client?.name}</p>
              <p className="text-slate-400 text-sm mt-1">{client?.email}</p>
            </div>
          </div>

          {/* Project Info */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-white mb-2 border-b-2 border-slate-800 pb-2 inline-block">تفاصيل المشروع والقيمة</h3>
            <div className="mt-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-300 font-medium mb-2"><span className="font-bold text-indigo-400">المشروع:</span> {project?.title}</p>
              <p className="text-slate-300 font-medium"><span className="font-bold text-indigo-400">القيمة المتفق عليها:</span> <span className="text-emerald-400 font-black text-xl">\${contract.value}</span></p>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-16">
            <h3 className="text-lg font-bold text-white mb-4 border-b-2 border-slate-800 pb-2 inline-block">البنود والشروط</h3>
            <div className="text-slate-300 leading-loose whitespace-pre-wrap font-medium p-6 bg-slate-950 rounded-2xl border border-slate-800">
              {contract.terms}
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end border-t-2 border-slate-800 pt-12">
            <div className="w-1/3">
              <h3 className="text-sm font-bold text-slate-500 mb-4 text-center">توقيع الطرف الأول</h3>
              <div className="border-b-2 border-dashed border-slate-600 pb-2 text-center text-slate-300 font-black font-serif italic text-2xl">
                {freelancerData?.displayName}
              </div>
            </div>
            <div className="w-1/3">
              <h3 className="text-sm font-bold text-slate-500 mb-4 text-center">توقيع الطرف الثاني</h3>
              <div className="border-b-2 border-dashed border-slate-600 h-10 relative">
                {contract.status === 'signed' && (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-black font-serif italic text-2xl -rotate-12">
                    {contract.clientSignature || client?.name}
                  </div>
                )}
              </div>
              {contract.status === 'signed' && contract.signedAt && (
                <p className="text-center mt-2 text-xs text-slate-400 font-bold">
                  مُوقّع: {new Date((contract.signedAt as any).toDate?.() || contract.signedAt).toLocaleString('ar-EG')}
                </p>
              )}
            </div>
          </div>

          {/* Sign Action */}
          {contract.status !== 'signed' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-16 text-center border-t border-slate-800 pt-8"
            >
              <p className="text-slate-400 text-sm mb-4 font-bold">يرجى قراءة البنود جيداً قبل التوقيع.</p>
              <button 
                onClick={handleSign}
                disabled={signing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg py-4 px-12 rounded-xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all disabled:opacity-50"
              >
                {signing ? 'جاري التوقيع...' : 'أوافق وأوقع إلكترونياً'}
              </button>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
