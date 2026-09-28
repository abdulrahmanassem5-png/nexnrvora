import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { PortfolioItem } from '../../types';

export default function PortfolioSettings() {
  const { currentUser, userData } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Item Form
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<PortfolioItem>>({});

  useEffect(() => {
    if (userData) {
      setBio(userData.bio || '');
      setSkills(userData.skills?.join(', ') || '');
      setCustomLogoUrl(userData.customLogoUrl || '');
    }
  }, [userData]);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchItems = async () => {
      try {
        const q = query(
          collection(db, `freelancers/${currentUser.uid}/portfolio`),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PortfolioItem[]);
      } catch (err) {
        console.error("Error fetching portfolio items:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      await updateDoc(doc(db, `users/${currentUser.uid}`), {
        bio,
        skills: skillsArray,
        customLogoUrl
      });

      alert('تم حفظ الملف الشخصي بنجاح!');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveItem = async () => {
    if (!currentUser || !editItem.title) return;
    try {
      const isNew = !editItem.id;
      const itemId = editItem.id || Date.now().toString();
      
      const payload: any = {
        freelancerId: currentUser.uid,
        title: editItem.title,
        description: editItem.description || '',
        imageUrl: editItem.imageUrl || '',
        link: editItem.link || '',
        order: editItem.order || items.length,
      };

      if (isNew) payload.createdAt = new Date();

      await setDoc(doc(db, `freelancers/${currentUser.uid}/portfolio/${itemId}`), payload, { merge: true });
      
      if (isNew) {
        setItems(prev => [...prev, { id: itemId, ...payload }]);
      } else {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...payload } : i));
      }
      
      setIsEditing(false);
      setEditItem({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!currentUser || !window.confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, `freelancers/${currentUser.uid}/portfolio/${id}`));
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-in fade-in max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50 mb-2">إعدادات معرض الأعمال</h2>
          <p className="text-slate-400 font-medium">قم بإعداد النبذة الشخصية وإضافة أفضل أعمالك لمشاركتها مع العملاء.</p>
        </div>
        {currentUser && (
          <a 
            href={`/p/${currentUser.uid}`} 
            target="_blank" 
            rel="noreferrer"
            className="bg-indigo-500/10 text-indigo-400 font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            معاينة الرابط العام
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 sticky top-8">
            <h3 className="text-lg font-black text-slate-50 mb-6">النبذة والمهارات</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">نبذة عنك (Bio)</label>
                <textarea 
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={4}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="أنا مطور واجهات مستخدم مع خبرة 5 سنوات..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">المهارات (مفصولة بفاصلة)</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="React, Node.js, UI/UX"
                />
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-colors"
              >
                {savingProfile ? 'جاري الحفظ...' : 'حفظ الملف الشخصي'}
              </button>
            </div>
          </div>
        </div>

        {/* Portfolio Items */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-50">الأعمال والمشاريع</h3>
              <button 
                onClick={() => { setEditItem({}); setIsEditing(true); }}
                className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 transition-colors"
              >
                + إضافة عمل جديد
              </button>
            </div>

            {isEditing && (
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-8 animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-200 mb-2">عنوان العمل</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl"
                      value={editItem.title || ''} onChange={e => setEditItem({...editItem, title: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-200 mb-2">وصف مختصر</label>
                    <textarea 
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl" rows={2}
                      value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-2">رابط صورة (مؤقت)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl"
                      value={editItem.imageUrl || ''} onChange={e => setEditItem({...editItem, imageUrl: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-2">رابط المشروع</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl"
                      value={editItem.link || ''} onChange={e => setEditItem({...editItem, link: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-slate-300 font-bold hover:bg-slate-800 rounded-xl">إلغاء</button>
                  <button onClick={handleSaveItem} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/10">حفظ العمل</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-10 text-slate-400 font-bold">جاري التحميل...</div>
            ) : items.length === 0 && !isEditing ? (
              <div className="text-center py-12 text-slate-400 font-medium bg-slate-950 rounded-2xl">
                لم تقم بإضافة أي أعمال لمعرضك حتى الآن.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                  <div key={item.id} className="group relative rounded-2xl overflow-hidden border border-slate-800/60 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 hover:shadow-xl shadow-indigo-500/10 transition-all">
                    {item.imageUrl ? (
                      <div className="h-40 w-full bg-slate-800">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="p-4 bg-slate-900">
                      <h4 className="font-bold text-slate-50 mb-1 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    </div>
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button onClick={() => { setEditItem(item); setIsEditing(true); }} className="w-10 h-10 rounded-full bg-slate-900 text-indigo-400 flex items-center justify-center shadow-2xl shadow-indigo-500/20 hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="w-10 h-10 rounded-full bg-slate-900 text-red-500 flex items-center justify-center shadow-2xl shadow-indigo-500/20 hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
