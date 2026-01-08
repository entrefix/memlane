import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Landing from '../pages/Landing';
import Unified from '../pages/Unified';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Settings from '../pages/Settings';

// OAuth callback handler component
function AuthCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check URL params for the type (e.g., recovery, signup, magiclink)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');

        // Supabase will handle the OAuth callback automatically
        // We just need to wait for the session to be established
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // If it's a password recovery link, redirect to reset password page
          if (type === 'recovery') {
            navigate('/reset-password');
          } else {
            // For other auth types (oauth, magiclink), go to home
            navigate('/home');
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );
}

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/home" replace />} />
      <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/home" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={!user ? <Landing /> : <Navigate to="/home" replace />} />
      <Route path="/home" element={user ? <Unified /> : <Navigate to="/login" replace />} />
      <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    </Routes>
  );
}