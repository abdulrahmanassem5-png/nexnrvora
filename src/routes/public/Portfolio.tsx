import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { User, PortfolioItem, Project } from '../../types';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export default function PublicPortfolio() {
  const { freelancerId } = useParams();
  const [freelancer, setFreelancer] = useState<User | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!freelancerId) return;
    
    const fetchPortfolio = async () => {
      try {
        const fSnap = await getDoc(doc(db, `users/${freelancerId}`));
        if (!fSnap.exists() || fSnap.data().role !== 'freelancer') {
          setError(true);
          return;
        }
        setFreelancer(fSnap.data() as User);

        const q = query(
          collection(db, `freelancers/${freelancerId}/portfolio`),
          orderBy('order', 'asc')
        );
        const pSnap = await getDocs(q);
        setItems(pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PortfolioItem[]);

        // Fetch Reviews
        const reviewsQ = query(collection(db, `freelancers/${freelancerId}/projects`));
        const revSnap = await getDocs(reviewsQ);
        const allProjects = revSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
        setReviews(allProjects.filter(p => p.review?.isPublic === true));

      } catch (err) {
        console.error("Error fetching portfolio:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, [freelancerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-50 mb-4">404</h1>
          <p className="text-slate-400 font-medium">عذراً، لم يتم العثور على معرض الأعمال.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Helmet>
        <title>{`${freelancer.displayName} | معرض الأعمال - NEXNRVORA`}</title>
        <meta name="description" content={freelancer.bio || `تعرف على أعمال وخدمات ${freelancer.displayName} الاحترافية عبر منصة NEXNRVORA.`} />
        <meta name="keywords" content={`${freelancer.skills?.join(', ')}, عمل حر, مستقل, ${freelancer.displayName}`} />
        <meta property="og:title" content={`${freelancer.displayName} | معرض الأعمال - NEXNRVORA`} />
        <meta property="og:description" content={freelancer.bio || `تعرف على أعمال وخدمات ${freelancer.displayName} الاحترافية عبر منصة NEXNRVORA.`} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${freelancer.displayName} | معرض الأعمال`} />
        <meta name="twitter:description" content={freelancer.bio || `تعرف على أعمال وخدمات ${freelancer.displayName} الاحترافية.`} />
      </Helmet>
      
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-black bg-gradient-to-l from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {freelancer.displayName}
          </div>
          <a href={`mailto:${freelancer.email}`} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold shadow-xl shadow-indigo-500/10 hover:bg-slate-800 transition-colors">
            تواصل معي
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full blur-[100px] -mr-20 -mt-20 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 rounded-full blur-[100px] -ml-20 -mb-20 opacity-60"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8">
            مرحباً، أنا <span className="text-indigo-400">{freelancer.displayName?.split(' ')[0]}</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
            {freelancer.bio || 'مستقل محترف ومستعد للعمل على مشروعك القادم بأسلوب مبتكر وجودة عالية.'}
          </p>
          
          {freelancer.skills && freelancer.skills.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {freelancer.skills.map((skill, i) => (
                <span key={i} className="px-4 py-2 bg-slate-900 border border-slate-800/60 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 rounded-full text-slate-200 font-bold text-sm">
                  {skill}
                </span>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-20 px-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-12 text-center">أحدث الأعمال</h2>
          
          {items.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-medium bg-slate-950 rounded-3xl border border-slate-800">
              لا توجد أعمال معروضة حالياً.
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.2 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {items.map((item) => (
                <motion.div 
                  variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0 } }}
                  key={item.id} 
                  className="group flex flex-col bg-slate-950 rounded-3xl overflow-hidden border border-slate-800/60 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-500 hover:-translate-y-2"
                >
                  <div className="h-56 w-full relative overflow-hidden bg-slate-800">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-300">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-indigo-600/10 group-hover:bg-transparent transition-colors duration-500"></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-slate-50 mb-2">{item.title}</h3>
                    <p className="text-slate-300 font-medium text-sm leading-relaxed mb-6 flex-1">{item.description}</p>
                    
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-800 transition-colors mt-auto">
                        عرض المشروع
                        <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section className="py-20 px-6 bg-slate-950 border-t border-slate-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black text-white mb-12 text-center">آراء العملاء</h2>
            
            <motion.div 
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {reviews.map(proj => (
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} key={proj.id} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative">
                  <div className="absolute top-8 left-8 text-slate-800">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-5 h-5 \${proj.review!.rating >= star ? 'text-yellow-500' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                  
                  <p className="text-slate-300 leading-relaxed mb-6 italic relative z-10">"{proj.review!.text}"</p>
                  
                  <div className="pt-6 border-t border-slate-800">
                    <p className="font-bold text-slate-100">عميل في مشروع:</p>
                    <p className="text-sm text-indigo-400 mt-1">{proj.title}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="py-10 text-center bg-indigo-600 text-slate-400 font-medium">
        <p>تم الإنشاء بواسطة <span className="text-white font-bold tracking-widest">NEXNRVORA</span> منصة المستقلين</p>
      </footer>
    </div>
  );
}
