import { useAuth } from './authContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return <div className="loading-screen">Checking auth...</div>;

  return isLoggedIn ? <Outlet /> : <Navigate to="/" replace />;
}