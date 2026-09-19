import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Import all your screens
import LandingPage from './screens/LandingPage.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Income from './screens/Income.jsx';
import Expenses from './screens/Expenses.jsx';
import Family from './screens/Family.jsx';
import Goals from './screens/Goals.jsx';
import NetWorth from './screens/NetWorth.jsx';
import Settings from './screens/Settings.jsx';
import Profile from './screens/Profile.jsx';

// Import components
import Sidebar from './components/Sidebar.jsx';

// --- 1. PROTECTED ROUTE (The Bouncer) ---
// If a user isn't logged in, kick them back to /signin
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="loading-screen" style={{ padding: 20, textAlign: 'center' }}>Loading Anchor...</div>;

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

// --- 2. APP LAYOUT (Sidebar + Content) ---
function AppLayout() {
  const [activeScreen, setScreen] = useState('dashboard');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app">
      <Sidebar activeScreen={activeScreen} setScreen={setScreen} onLogout={handleLogout} />
      
      <main className="main">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'income' && <Income />}
        {activeScreen === 'expenses' && <Expenses />}
        {activeScreen === 'family' && <Family />}
        {activeScreen === 'goals' && <Goals />}
        {activeScreen === 'networth' && <NetWorth />}
        {activeScreen === 'settings' && <Settings />}
        {activeScreen === 'profile' && <Profile onLogout={handleLogout} />}
      </main>
    </div>
  );
}

// --- 3. MAIN APP & ROUTING ---
export default function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC SIDE */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<AuthScreen defaultMode="signin" />} />
        <Route path="/signup" element={<AuthScreen defaultMode="signup" />} />

        {/* PRIVATE SIDE */}
        <Route 
          path="/app/*" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />

        {/* Fallback: If someone types a nonsense URL, send them home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}