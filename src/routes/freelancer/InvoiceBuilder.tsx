import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Invoice, InvoiceItem, Project, Client, Task } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoiceBuilder() {
  const { projectId, invoiceId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(!invoiceId);
  
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [invoice, setInvoice] = useState<Partial<Invoice>>({
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    items: [],
    discount: 0,
  });

  useEffect(() => {
    if (!currentUser || !projectId) return;

    const fetchData = async () => {
      try {
        // Fetch Project and Client
        const pSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/projects/${projectId}`));
        if (pSnap.exists()) {
          const p = pSnap.data() as Project;
          setProject({ ...p, id: pSnap.id } as Project);
          
          const cSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/clients/${p.clientId}`));
          if (cSnap.exists()) {
            setClient({ id: cSnap.id, ...cSnap.data() } as Client);
          }
        }

        // Fetch Invoice if it exists
        if (invoiceId) {
          const invSnap = await getDoc(doc(db, `freelancers/${currentUser.uid}/invoices/${invoiceId}`));
          if (invSnap.exists()) {
            const data = invSnap.data();
            setInvoice({
              ...data,
              issueDate: data.issueDate?.toDate ? data.issueDate.toDate().toISOString().split('T')[0] : data.issueDate,
              dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString().split('T')[0] : data.dueDate,
            });
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
  }, [currentUser, projectId, invoiceId]);

  const calculateSubtotal = (items: InvoiceItem[]) => items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

  const handleAddItem = () => {
    setInvoice(prev => {
      const items = [...(prev.items || []), { id: Date.now().toString(), description: '', quantity: 1, price: 0 }];
      const subtotal = calculateSubtotal(items);
      return { ...prev, items, subtotal, total: subtotal - (prev.discount || 0) };
    });
  };

  const handleRemoveItem = (id: string) => {
    setInvoice(prev => {
      const items = (prev.items || []).filter(i => i.id !== id);
      const subtotal = calculateSubtotal(items);
      return { ...prev, items, subtotal, total: subtotal - (prev.discount || 0) };
    });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const items = (prev.items || []).map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      const subtotal = calculateSubtotal(items);
      return { ...prev, items, subtotal, total: subtotal - (prev.discount || 0) };
    });
  };

  const handleSave = async () => {
    if (!currentUser || !project || !client) return;
    setSaving(true);
    
    try {
      const targetId = invoiceId || doc(collection(db, 'temp')).id;
      
      const payload: Invoice = {
        projectId: project.id,
        clientId: client.id,
        invoiceNumber: invoice.invoiceNumber!,
        items: invoice.items || [],
        subtotal: invoice.subtotal || 0,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        status: invoice.status as any,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        createdAt: isNew ? serverTimestamp() : invoice.createdAt,
      };

      await setDoc(doc(db, `freelancers/${currentUser.uid}/invoices/${targetId}`), payload, { merge: true });
      
      if (isNew) {
        navigate(`/app/projects/${projectId}/invoice/${targetId}`, { replace: true });
      } else {
        alert("تم الحفظ بنجاح!");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleImportTrackedTime = async () => {
    if (!currentUser || !projectId) return;
    
    const rateInput = window.prompt("أدخل سعر الساعة (بالدولار):", "20");
    if (!rateInput) return;
    
    const hourlyRate = parseFloat(rateInput) || 0;
    
    try {
      const q = query(
        collection(db, `freelancers/${currentUser.uid}/projects/${projectId}/tasks`),
        where('status', '==', 'done')
      );
      
      const snap = await getDocs(q);
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      
      const tasksWithTime = tasks.filter(t => t.timeSpent > 0);
      
      if (tasksWithTime.length === 0) {
        alert("لا توجد مهام مكتملة بوقت مسجل لاستيرادها.");
        return;
      }

      setInvoice(prev => {
        const existingItems = prev.items || [];
        
        const newItems: InvoiceItem[] = tasksWithTime.map(task => {
          const hours = parseFloat((task.timeSpent / 3600).toFixed(2));
          return {
            id: `task_${task.id}`,
            description: `العمل على: ${task.title}`,
            quantity: hours,
            price: hourlyRate,
          };
        });

        const items = [...existingItems, ...newItems];
        const subtotal = calculateSubtotal(items);
        return { ...prev, items, subtotal, total: subtotal - (prev.discount || 0) };
      });
      
    } catch (error) {
      console.error("Error importing tasks:", error);
    }
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    const element = invoiceRef.current;
    
    try {
      // Temporary style adjustments for PDF capture
      element.style.padding = '40px';
      element.style.borderRadius = '0';
      element.style.boxShadow = 'none';
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      
      // Revert styles
      element.style.padding = '';
      element.style.borderRadius = '';
      element.style.boxShadow = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto flex flex-col xl:flex-row gap-8 items-start">
      
      {/* Controls Sidebar */}
      <div className="w-full xl:w-80 bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 sticky top-8 shrink-0">
        <h3 className="text-xl font-black text-slate-50 mb-6">إعدادات الفاتورة</h3>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">رقم الفاتورة</label>
            <input 
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" 
              value={invoice.invoiceNumber}
              onChange={e => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">تاريخ الإصدار</label>
            <input 
              type="date"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={invoice.issueDate}
              onChange={e => setInvoice(prev => ({ ...prev, issueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">تاريخ الاستحقاق</label>
            <input 
              type="date"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={invoice.dueDate}
              onChange={e => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">حالة الفاتورة</label>
            <select 
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer" 
              value={invoice.status}
              onChange={e => setInvoice(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="draft">مسودة</option>
              <option value="sent">تم الإرسال للعميل</option>
              <option value="paid">مدفوعة</option>
              <option value="overdue">متأخرة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">الخصم ($)</label>
            <input 
              type="number"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={invoice.discount}
              onChange={e => {
                const discount = parseFloat(e.target.value) || 0;
                setInvoice(prev => ({ ...prev, discount, total: (prev.subtotal || 0) - discount }));
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
          </button>
          {!isNew && (
            <button 
              onClick={downloadPDF}
              className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl shadow-xl shadow-indigo-500/10 hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تحميل PDF
            </button>
          )}
        </div>
      </div>

      {/* Visual Invoice Builder Area (A4 Paper Style) */}
      <div className="flex-1 overflow-x-auto pb-10">
        <div 
          ref={invoiceRef}
          className="min-w-[800px] max-w-[800px] mx-auto bg-slate-900 shadow-xl shadow-slate-200/50 rounded-lg p-10 lg:p-14 border border-slate-800"
          style={{ minHeight: '1131px' }} // A4 aspect ratio approximation at 800px width
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-16 border-b-2 border-slate-900 pb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">فاتورة</h1>
              <p className="text-slate-400 font-medium">#{invoice.invoiceNumber}</p>
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-black text-indigo-400 mb-1 tracking-widest uppercase">NEXNRVORA</h2>
              <p className="text-slate-400 font-medium text-sm">منصة المستقلين</p>
            </div>
          </div>

          {/* Details */}
          <div className="flex justify-between mb-12">
            <div>
              <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">فاتورة إلى</h3>
              <p className="text-xl font-bold text-slate-50">{client?.name}</p>
              <p className="text-slate-400">{client?.email}</p>
              <p className="text-slate-400 mt-2 font-medium">مشروع: {project?.title}</p>
            </div>
            <div className="text-left">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">تاريخ الإصدار</h3>
                <p className="font-bold text-slate-50">{invoice.issueDate}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">تاريخ الاستحقاق</h3>
                <p className="font-bold text-slate-50">{invoice.dueDate}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-12 min-h-[300px]">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-400 text-sm">
                  <th className="pb-3 font-bold w-1/2">الوصف</th>
                  <th className="pb-3 font-bold">الكمية</th>
                  <th className="pb-3 font-bold">السعر</th>
                  <th className="pb-3 font-bold">المجموع</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map(item => (
                  <tr key={item.id} className="group">
                    <td className="py-4">
                      <input 
                        placeholder="وصف الخدمة..." 
                        className="w-full bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-50"
                        value={item.description}
                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="py-4">
                      <input 
                        type="number"
                        className="w-20 bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-50"
                        value={item.quantity}
                        onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-4">
                      <input 
                        type="number"
                        className="w-24 bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-50"
                        value={item.price}
                        onChange={e => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-4 font-bold text-slate-50">
                      ${(item.quantity * item.price).toFixed(2)}
                    </td>
                    <td className="py-4 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button 
              onClick={handleAddItem}
              className="mt-6 text-indigo-400 font-bold hover:bg-indigo-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm print:hidden"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              إضافة بند جديد
            </button>
            <button 
              onClick={handleImportTrackedTime}
              className="mt-6 ml-4 text-emerald-400 font-bold hover:bg-emerald-500/10 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-2 text-sm print:hidden"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              استيراد الساعات المسجلة
            </button>
          </div>

          {/* Totals */}
          <div className="flex justify-end border-t-2 border-slate-900 pt-8">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-slate-400 font-medium">
                <span>المجموع الفرعي:</span>
                <span>${(invoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-medium">
                <span>الخصم:</span>
                <span>${(invoice.discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-white pt-3 border-t border-slate-800">
                <span>الإجمالي:</span>
                <span>${(invoice.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-20 text-center text-slate-400 text-sm font-medium">
            شكراً لتعاملكم معنا.
          </div>
        </div>
      </div>
      
    </div>
  );
}
