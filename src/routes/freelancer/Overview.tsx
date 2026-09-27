import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Project, Client } from '../../types';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/freelancer/StatusBadge';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Overview() {
  const { currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchOverviewData = async () => {
      try {
        // Fetch clients count
        const clientsQuery = query(collection(db, `freelancers/${currentUser.uid}/clients`));
        const clientsSnap = await getDocs(clientsQuery);
        const totalClients = clientsSnap.size;

        // Fetch projects for stats and recent
        const projectsQuery = query(
          collection(db, `freelancers/${currentUser.uid}/projects`),
          orderBy('updatedAt', 'desc')
        );
        const projectsSnap = await getDocs(projectsQuery);
        
        let active = 0;
        let completed = 0;
        const allProjects: Project[] = [];

        projectsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'delivered') {
            completed++;
          } else {
            active++;
          }
          allProjects.push({ id: doc.id, ...data } as Project);
        });

        // Fetch paid invoices for revenue stats
        const invoicesQuery = query(collection(db, `freelancers/${currentUser.uid}/invoices`), /*where*/('status', '==', 'paid'));
        const invoicesSnap = await getDocs(invoicesQuery);
        let totalRev = 0;
        
        // Group revenue by month for the chart
        const revByMonth: Record<string, number> = {};
        
        invoicesSnap.forEach(doc => {
          const inv = doc.data();
          totalRev += inv.total || 0;
          
          if (inv.issueDate) {
            const date = new Date(inv.issueDate);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            revByMonth[monthStr] = (revByMonth[monthStr] || 0) + (inv.total || 0);
          }
        });
        
        // Format chart data (last 6 months)
        const chartData = Object.keys(revByMonth).sort().slice(-6).map(month => ({
          name: month,
          revenue: revByMonth[month]
        }));
        
        if (chartData.length === 0) {
          // Mock data if empty
          chartData.push(
            { name: 'Jan', revenue: 400 },
            { name: 'Feb', revenue: 800 },
            { name: 'Mar', revenue: 600 },
            { name: 'Apr', revenue: 1200 },
            { name: 'May', revenue: 1500 }
          );
        }

        setRevenueData(chartData);

        setStats({
          totalClients,
          activeProjects: active,
          completedProjects: completed,
          totalRevenue: totalRev,
        });

        // Get top 3 recent projects
        setRecentProjects(allProjects.slice(0, 3));
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-6xl mx-auto space-y-8"
    >
      
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-black text-slate-50 mb-2">
          مرحباً بك، {userData?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 font-medium">إليك نظرة سريعة على أداء أعمالك اليوم.</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-800/60 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-semibold mb-2">إجمالي الإيرادات</h3>
            <div className="text-4xl font-black text-slate-50">${stats.totalRevenue.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-blue-500/10 border border-slate-800/60 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-semibold mb-2">المشاريع النشطة</h3>
            <div className="text-4xl font-black text-slate-50">{stats.activeProjects}</div>
          </div>
        </div>
        
        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-emerald-500/10 border border-slate-800/60 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-semibold mb-2">مشاريع مكتملة</h3>
            <div className="text-4xl font-black text-slate-50">{stats.completedProjects}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl shadow-amber-500/10 border border-slate-800/60 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
          <div className="relative z-10">
            <h3 className="text-slate-400 font-semibold mb-2">إجمالي العملاء</h3>
            <div className="text-4xl font-black text-slate-50">{stats.totalClients}</div>
          </div>
        </div>
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/60 shadow-xl">
          <h3 className="text-xl font-bold text-slate-50 mb-6">نمو الإيرادات</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projects Pie Chart */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/60 shadow-xl flex flex-col">
          <h3 className="text-xl font-bold text-slate-50 mb-6">توزيع المشاريع</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'نشطة', value: stats.activeProjects },
                    { name: 'مكتملة', value: stats.completedProjects }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm font-medium">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> نشطة</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> مكتملة</div>
          </div>
        </div>
      </motion.div>

      {/* Recent Projects */}
      <motion.div variants={itemVariants}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-50">أحدث المشاريع</h2>
          <Link to="/app/clients" className="text-indigo-400 font-semibold text-sm hover:text-indigo-400 transition-colors bg-indigo-500/10 px-4 py-2 rounded-full">
            عرض الكل &larr;
          </Link>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">لا توجد مشاريع حالياً</h3>
            <p className="text-slate-400">ابدأ بإضافة عملائك وإنشاء أول مشروع لك.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map(project => (
              <Link 
                key={project.id} 
                to={`/app/projects/${project.id}`}
                className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 border border-slate-800/60 hover:shadow-2xl shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300 block group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-slate-50 group-hover:text-indigo-400 transition-colors line-clamp-1">{project.title}</h3>
                  <StatusBadge status={project.status} />
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-4">{project.description}</p>
                <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 font-medium">
                  <span>تحديث: {project.updatedAt ? new Date((project.updatedAt as any).toDate?.() || project.updatedAt).toLocaleDateString('ar-EG') : ''}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform inline-block opacity-0 group-hover:opacity-100">&larr; التفاصيل</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}
