import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  
  const inviteFreelancerId = searchParams.get('freelancerId');
  const inviteClientId = searchParams.get('clientId');
  
  const initialMode = searchParams.get('mode');
  
  const [mode, setMode] = useState<'login' | 'signup_freelancer' | 'signup_client'>(
    inviteFreelancerId && inviteClientId ? 'signup_client' : (initialMode === 'signup' ? 'signup_freelancer' : 'login')
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (currentUser && role) {
      navigate(role === 'freelancer' ? '/app' : '/portal');
    }
  }, [currentUser, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup_freelancer') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', user.uid), {
          role: 'freelancer',
          email: user.email,
          displayName: name,
          createdAt: new Date(),
          freelancerId: user.uid
        });
      } else if (mode === 'signup_client') {
        if (!inviteFreelancerId || !inviteClientId) throw new Error("رابط الدعوة غير صالح");
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'users', user.uid), {
          role: 'client',
          email: user.email,
          displayName: name,
          createdAt: new Date(),
          freelancerId: inviteFreelancerId,
          clientId: inviteClientId
        });
        
        await updateDoc(doc(db, `freelancers/${inviteFreelancerId}/clients`, inviteClientId), {
          clientUserId: user.uid
        });
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If user doesn't exist in our Firestore, create them
      if (!userDoc.exists()) {
        if (mode === 'signup_client' || (inviteFreelancerId && inviteClientId)) {
          if (!inviteFreelancerId || !inviteClientId) throw new Error("رابط الدعوة غير صالح");
          
          await setDoc(userDocRef, {
            role: 'client',
            email: user.email,
            displayName: user.displayName || 'عميل',
            createdAt: new Date(),
            freelancerId: inviteFreelancerId,
            clientId: inviteClientId
          });
          
          await updateDoc(doc(db, `freelancers/${inviteFreelancerId}/clients`, inviteClientId), {
            clientUserId: user.uid
          });
        } else {
          await setDoc(userDocRef, {
            role: 'freelancer',
            email: user.email,
            displayName: user.displayName || 'مستقل',
            createdAt: new Date(),
            freelancerId: user.uid
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول بجوجل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-900">
      {/* Animated Background Gradients */}
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md p-8 bg-slate-900/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 text-white">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mb-4 shadow-2xl shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'login' ? 'مرحباً بعودتك' : mode === 'signup_freelancer' ? 'إنشاء حساب جديد' : 'بوابة العملاء'}
          </h1>
          <p className="text-gray-300 mt-2 text-sm">
            {mode === 'login' ? 'قم بتسجيل الدخول للمتابعة' : mode === 'signup_freelancer' ? 'ابدأ في إدارة مشاريعك باحترافية' : 'سجل لتتمكن من متابعة مشاريعك'}
          </p>
        </div>
        
        {error && <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-white rounded-lg text-sm backdrop-blur-sm">{error}</div>}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-gray-900 font-medium p-3 rounded-xl hover:bg-gray-50 transition-colors mb-6 shadow-2xl shadow-indigo-500/20 shadow-indigo-500/5 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          المتابعة باستخدام جوجل
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900/50 text-gray-400">أو بالبريد الإلكتروني</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'signup_freelancer' || mode === 'signup_client') && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">الاسم</label>
              <input
                type="text"
                required
                className="w-full p-3 bg-slate-900/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              className="w-full p-3 bg-slate-900/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              className="w-full p-3 bg-slate-900/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 mt-2 shadow-2xl shadow-indigo-500/20 shadow-blue-500/30"
          >
            {loading ? 'جاري التحميل...' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <p>
              ليس لديك حساب؟{' '}
              <button onClick={() => setMode('signup_freelancer')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                سجل كمستقل
              </button>
            </p>
          ) : mode === 'signup_freelancer' ? (
            <p>
              لديك حساب بالفعل؟{' '}
              <button onClick={() => setMode('login')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                سجل الدخول
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
