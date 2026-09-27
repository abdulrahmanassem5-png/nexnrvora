import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import type { Invoice } from '../../types';

export default function Financials() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    overdue: 0,
  });

  useEffect(() => {
    if (!currentUser) return;

    const fetchInvoices = async () => {
      try {
        const q = query(
          collection(db, `freelancers/${currentUser.uid}/invoices`),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        
        let revenue = 0;
        let outstanding = 0;
        let overdue = 0;
        const allInvoices: Invoice[] = [];
        
        snap.forEach(doc => {
          const inv = { id: doc.id, ...doc.data() } as Invoice;
          allInvoices.push(inv);
          
          if (inv.status === 'paid') revenue += inv.total;
          if (inv.status === 'sent') outstanding += inv.total;
          if (inv.status === 'overdue') {
            outstanding += inv.total;
            overdue += inv.total;
          }
        });

        setInvoices(allInvoices);
        setStats({ totalRevenue: revenue, outstanding, overdue });
      } catch (error) {
        console.error("Error fetching financials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [currentUser]);

  const getStatusBadge = (status: Invoice['status']) => {
    switch(status) {
      case 'paid': return <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">مدفوعة</span>;
      case 'sent': return <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">أُرسلت</span>;
      case 'overdue': return <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">متأخرة</span>;
      default: return <span className="bg-slate-800 text-slate-200 px-3 py-1 rounded-full text-xs font-bold border border-slate-800">مسودة</span>;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-50 mb-2">المالية والفواتير</h2>
        <p className="text-slate-400 font-medium">تتبع أرباحك وإدارة فواتير العملاء.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold mb-2">إجمالي الأرباح</h3>
            <div className="text-4xl font-black text-emerald-600">${stats.totalRevenue.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold mb-2">مبالغ مستحقة</h3>
            <div className="text-4xl font-black text-slate-50">${stats.outstanding.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-bold mb-2">فواتير متأخرة</h3>
            <div className="text-4xl font-black text-red-600">${stats.overdue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-xl font-bold text-slate-50">سجل الفواتير</h3>
        </div>
        
        {invoices.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium mb-4">لم تقم بإنشاء أي فواتير حتى الآن.</p>
            <p className="text-sm text-slate-400">يمكنك إنشاء فاتورة من داخل أي مشروع في صفحة تفاصيل المشروع.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm font-bold bg-slate-950/30">
                  <th className="p-4 pl-0">رقم الفاتورة</th>
                  <th className="p-4">تاريخ الإصدار</th>
                  <th className="p-4">تاريخ الاستحقاق</th>
                  <th className="p-4">الإجمالي</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left pr-0">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-950/50 transition-colors group">
                    <td className="p-4 font-bold text-slate-50">{inv.invoiceNumber}</td>
                    <td className="p-4 text-slate-300">
                      {inv.issueDate ? new Date((inv.issueDate as any).toDate?.() || inv.issueDate).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="p-4 text-slate-300">
                      {inv.dueDate ? new Date((inv.dueDate as any).toDate?.() || inv.dueDate).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="p-4 font-black text-slate-50">${inv.total.toFixed(2)}</td>
                    <td className="p-4">{getStatusBadge(inv.status)}</td>
                    <td className="p-4 text-left">
                      <Link 
                        to={`/app/projects/${inv.projectId}/invoice/${inv.id}`}
                        className="text-indigo-400 font-bold hover:text-indigo-400 text-sm bg-indigo-500/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        عرض الفاتورة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
