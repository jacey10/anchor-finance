import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ defaultMode = 'signin' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(defaultMode === 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // If user is already logged in, kick them to the app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app', { replace: true });
    });
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // FIX: Force reload to clear memory
        window.location.href = '/app'; 

      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // If Supabase returns a session, it means email confirmation is OFF.
        // We should log them in and send them to the dashboard immediately.n
        if (data.session) {
          // FIX: Force reload to clear memory
          window.location.href = '/app'; 
        } else {
          setMessage('Account created! Please check your email to confirm.');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (keep the rest of your beautiful JSX form exactly as it was) ...
  // Just make sure the "Sign Up" and "Log In" toggle links update the URL:
  // onClick={() => navigate(isLogin ? '/signup' : '/signin')}

  return (
    <div className="auth-split-screen">
      {/* Left Side: Visuals */}
      <div className="auth-visuals">
        <img src="/auth-bg.png" alt="Financial Future" className="auth-bg-image" />
        <div className="auth-overlay-text">
          {/* You can add a quote or branding here if you want */}
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h1 className="auth-main-title">Welcome to Anchor</h1>
            <h2 className="auth-sub-title">Anchor Your Financial Future</h2>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <label className="input-label">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="auth-input" 
                placeholder="you@example.com"
                required 
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="auth-input" 
                placeholder="••••••••"
                required 
                minLength={6}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success">{message}</p>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-footer-links">
            <button className="auth-link-btn" onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
            {isLogin && <button className="auth-link-btn">Forgot Password?</button>}
          </div>

          <div className="auth-social-divider">
            <span>Or continue with</span>
          </div>

          <div className="auth-social-buttons">
            <button className="social-btn" type="button">
              <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button className="social-btn" type="button">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}