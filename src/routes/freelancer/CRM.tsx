import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead } from '../../types';

const COLUMNS = {
  new: { id: 'new', title: 'تواصل جديد', color: 'bg-slate-800', dot: 'bg-slate-400' },
  contacted: { id: 'contacted', title: 'تم التواصل', color: 'bg-blue-500/10', dot: 'bg-blue-400' },
  negotiation: { id: 'negotiation', title: 'قيد التفاوض', color: 'bg-amber-500/10', dot: 'bg-amber-500' },
  converted: { id: 'converted', title: 'تم الاتفاق', color: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  lost: { id: 'lost', title: 'مرفوض / مفقود', color: 'bg-rose-500/10', dot: 'bg-rose-500' },
};

export default function CRM() {
  const { currentUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Lead form
  const [showForm, setShowForm] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({ name: '', email: '', estimatedValue: 0 });

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchLeads = async () => {
      try {
        const q = query(collection(db, `freelancers/${currentUser.uid}/leads`));
        const snap = await getDocs(q);
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Lead[]);
      } catch (err) {
        console.error("Error fetching leads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [currentUser]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !currentUser) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const newLeads = Array.from(leads);
    const movedLead = newLeads.find(l => l.id === draggableId);
    if (!movedLead) return;

    movedLead.status = destination.droppableId as Lead['status'];
    setLeads([...newLeads]);

    try {
      await updateDoc(doc(db, `freelancers/${currentUser.uid}/leads/${draggableId}`), {
        status: destination.droppableId
      });
    } catch (err) {
      console.error("Error updating lead status:", err);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newLead.name) return;
    
    const leadId = Date.now().toString();
    const payload: Lead = {
      id: leadId,
      freelancerId: currentUser.uid,
      name: newLead.name!,
      email: newLead.email || '',
      status: 'new',
      estimatedValue: Number(newLead.estimatedValue) || 0,
      notes: '',
      createdAt: new Date()
    };

    setLeads(prev => [...prev, payload]);
    setShowForm(false);
    setNewLead({ name: '', email: '', estimatedValue: 0 });

    try {
      await setDoc(doc(db, `freelancers/${currentUser.uid}/leads/${leadId}`), payload);
    } catch (err) {
      console.error("Error adding lead:", err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!currentUser || !window.confirm('حذف العميل المحتمل؟')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    try {
      await deleteDoc(doc(db, `freelancers/${currentUser.uid}/leads/${id}`));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="animate-in fade-in max-w-full overflow-hidden">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50 mb-2">العملاء المحتملين (Leads)</h2>
          <p className="text-slate-400 font-medium">تتبع مسار مبيعاتك وتفاوضك مع العملاء الجدد.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'إلغاء' : '+ إضافة عميل محتمل'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddLead} className="bg-slate-900 p-6 rounded-2xl border border-slate-800/60 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 mb-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">اسم العميل/الشركة</label>
              <input 
                type="text" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl"
                value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">البريد الإلكتروني (اختياري)</label>
              <input 
                type="email" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl"
                value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">القيمة المتوقعة ($)</label>
              <input 
                type="number" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl"
                value={newLead.estimatedValue || ''} onChange={e => setNewLead({...newLead, estimatedValue: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl">حفظ</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto pb-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 min-w-max items-start">
            {Object.values(COLUMNS).map(col => {
              const colLeads = leads.filter(l => l.status === col.id);
              const colValue = colLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
              
              return (
                <div key={col.id} className="w-80 shrink-0">
                  <div className="flex justify-between items-center mb-4 pr-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${col.dot}`} />
                      <h4 className="font-bold text-slate-200">{col.title}</h4>
                      <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">{colLeads.length}</span>
                    </div>
                    {colValue > 0 && <span className="text-xs font-bold text-slate-400">${colValue}</span>}
                  </div>
                  
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`min-h-[300px] p-3 rounded-3xl transition-colors border border-slate-800/50 ${col.color} ${snapshot.isDraggingOver ? 'ring-2 ring-indigo-300 ring-inset' : ''}`}
                      >
                        {colLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-slate-900 p-5 rounded-2xl border border-slate-800 mb-3 group transition-all ${snapshot.isDragging ? 'shadow-2xl shadow-indigo-200/50 scale-105 z-50' : 'shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 hover:shadow-xl shadow-indigo-500/10'}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-black text-slate-50 text-lg leading-tight">{lead.name}</h5>
                                  <button onClick={() => handleDeleteLead(lead.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                                {lead.email && <p className="text-sm text-slate-400 font-medium mb-3">{lead.email}</p>}
                                <div className="flex justify-between items-center border-t border-slate-800 pt-3">
                                  <span className="text-xs font-bold text-slate-400">القيمة المتوقعة:</span>
                                  <span className="font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md text-sm">${lead.estimatedValue}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
