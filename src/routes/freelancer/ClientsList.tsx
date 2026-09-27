import { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Client } from '../../types';

export default function ClientsList() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchClients = async () => {
      try {
        const q = query(collection(db, `freelancers/${currentUser.uid}/clients`));
        const querySnapshot = await getDocs(q);
        const clientsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClients();
  }, [currentUser]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const docRef = await addDoc(collection(db, `freelancers/${currentUser.uid}/clients`), {
        name: newClientName,
        email: newClientEmail,
        clientUserId: null,
        createdAt: serverTimestamp()
      });
      
      const link = `${window.location.origin}/login?freelancerId=${currentUser.uid}&clientId=${docRef.id}`;
      setInviteLink(link);
      
      setClients(prev => [...prev, {
        id: docRef.id,
        name: newClientName,
        email: newClientEmail,
        clientUserId: null,
        createdAt: new Date()
      }]);
      
      setNewClientName('');
      setNewClientEmail('');
    } catch (error) {
      console.error("Error adding client:", error);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('تم نسخ الرابط بنجاح!');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50">عملائي</h2>
          <p className="text-slate-400 mt-1">إدارة عملائك وإرسال دعوات جديدة.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl shadow-indigo-500/10 shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          إضافة عميل
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-50 mb-2">ليس لديك عملاء بعد</h3>
          <p className="text-slate-400 mb-6">قم بإضافة أول عميل لك للبدء في تنظيم مشاريعك.</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="text-indigo-400 font-bold hover:bg-indigo-500/10 px-6 py-2 rounded-full transition-colors"
          >
            إضافة عميل جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clients.map(client => (
            <Link 
              key={client.id} 
              to={`/app/clients/${client.id}`}
              className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300 block group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-12 h-12 bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center text-xl font-black mb-4">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-xl mb-1 text-slate-50">{client.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{client.email}</p>
              <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                <span className={`w-2 h-2 rounded-full ${client.clientUserId ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="text-xs font-bold text-slate-300">
                  {client.clientUserId ? 'مسجل في البوابة' : 'في انتظار التسجيل'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-indigo-600/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-50 mb-6">إضافة عميل جديد</h3>
            
            {!inviteLink ? (
              <form onSubmit={handleAddClient} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-2">اسم العميل</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    placeholder="مثال: شركة التقنية"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    value={newClientEmail}
                    onChange={e => setNewClientEmail(e.target.value)}
                    placeholder="client@company.com"
                  />
                </div>
                <div className="flex gap-3 justify-end mt-8">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-slate-300 font-bold hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors"
                  >
                    إضافة العميل
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-black text-slate-50 mb-2">تم إضافة العميل بنجاح!</h4>
                <p className="text-sm text-slate-400 mb-6">أرسل رابط الدعوة هذا للعميل ليتمكن من الدخول إلى بوابته الخاصة:</p>
                
                <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-2 mb-8">
                  <input 
                    type="text" 
                    readOnly 
                    value={inviteLink} 
                    className="w-full bg-transparent text-sm text-slate-300 outline-none px-2" 
                    dir="ltr"
                  />
                  <button 
                    onClick={copyLink}
                    className="bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 hover:bg-slate-950 transition-colors shrink-0"
                  >
                    نسخ الرابط
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setInviteLink('');
                  }}
                  className="w-full px-4 py-3 bg-slate-800 text-slate-200 font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
