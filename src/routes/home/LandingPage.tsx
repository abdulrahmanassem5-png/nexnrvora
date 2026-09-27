import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';
import { MarketingBot } from '../../components/public/MarketingBot';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { currentUser, role, loading } = useAuth();

  if (loading) return null;

  // If already logged in, redirect them to their dashboard
  if (currentUser && role) {
    return <Navigate to={role === 'freelancer' ? '/app' : '/portal'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-hidden">
      <Helmet>
        <title>NEXNRVORA - منصة الإدارة المتكاملة للمستقلين</title>
        <meta name="description" content="منصة متكاملة للمستقلين تتيح لك إنشاء بوابة مخصصة لعملائك، إدارة مشاريعك، ومتابعة فواتيرك باحترافية." />
        <meta name="keywords" content="عمل حر, مستقل, فواتير, إدارة مشاريع, بوابة عملاء, NEXNRVORA, Freelance, Project Management" />
        <meta property="og:title" content="NEXNRVORA - منصة الإدارة المتكاملة للمستقلين" />
        <meta property="og:description" content="منصة متكاملة للمستقلين تتيح لك إنشاء بوابة مخصصة لعملائك، إدارة مشاريعك، ومتابعة فواتيرك باحترافية." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NEXNRVORA" />
        <meta name="twitter:description" content="أدر مشاريعك وعملائك باحترافية تامة مع منصة NEXNRVORA للمستقلين." />
      </Helmet>

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="text-2xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          NEXNRVORA
        </div>
        <div className="flex gap-4">
          <Link 
            to="/login" 
            className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            تسجيل الدخول
          </Link>
          <Link 
            to="/login?mode=signup" 
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-2xl shadow-indigo-500/20 shadow-blue-500/30"
          >
            ابدأ مجاناً
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-24 text-center relative z-10">
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight"
        >
          أدر مشاريعك وعملائك <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            باحترافية تامة
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          منصة متكاملة للمستقلين (Freelancers) تتيح لك إنشاء بوابة مخصصة لعملائك، متابعة حالة المشاريع، ومشاركة الملفات بسهولة وأمان.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link 
            to="/login?mode=signup" 
            className="px-8 py-4 text-lg font-bold bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-transform hover:scale-105 shadow-xl"
          >
            أنشئ حسابك الآن
          </Link>
          <Link 
            to="/login" 
            className="px-8 py-4 text-lg font-bold border border-white/20 rounded-full hover:bg-white/10 transition-colors"
          >
            لدي حساب بالفعل
          </Link>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.2 }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 text-right"
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-lg border border-white/10 p-8 rounded-3xl hover:bg-slate-900/60 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">بوابة لكل عميل</h3>
            <p className="text-gray-400 text-sm leading-relaxed">أرسل رابط دعوة لعملائك ليتمكنوا من الدخول ومتابعة مشاريعهم الخاصة دون رؤية بيانات العملاء الآخرين.</p>
          </motion.div>
          
          <motion.div variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-lg border border-white/10 p-8 rounded-3xl hover:bg-slate-900/60 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">تتبع حالة المشروع</h3>
            <p className="text-gray-400 text-sm leading-relaxed">غيّر حالة المشروع (جاري التنفيذ، مراجعة، تم التسليم) ليعرف العميل أين وصل مشروعه بلمحة واحدة.</p>
          </motion.div>
          
          <motion.div variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0 } }} className="bg-slate-900/40 backdrop-blur-lg border border-white/10 p-8 rounded-3xl hover:bg-slate-900/60 transition-colors">
            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center mb-6 text-pink-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3">مشاركة الملفات</h3>
            <p className="text-gray-400 text-sm leading-relaxed">ارفع العقود، التصاميم، والفواتير بضغطة زر. العميل يستطيع تحميلها فوراً من بوابته الخاصة بأمان.</p>
          </motion.div>
        </motion.div>
      </main>

      <MarketingBot />
    </div>
  );
}
