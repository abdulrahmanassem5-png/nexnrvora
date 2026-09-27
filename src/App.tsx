import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/auth/Login';
import Dashboard from './routes/freelancer/Dashboard';
import Portal from './routes/client/Portal';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './routes/home/LandingPage';
import Portfolio from './routes/public/Portfolio';
import { SEO } from './components/shared/SEO';

function App() {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-500 text-lg">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO />
      <Routes>
        <Route path="/" element={<LandingPage />} />
      <Route path="/p/:freelancerId" element={<Portfolio />} />
      <Route 
        path="/login" 
        element={
          currentUser 
            ? <Navigate to={role === 'freelancer' ? '/app' : '/portal'} replace />
            : <Login />
        } 
      />
      
      <Route element={<ProtectedRoute allowedRole="freelancer" />}>
        <Route path="/app/*" element={<Dashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="client" />}>
        <Route path="/portal/*" element={<Portal />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
