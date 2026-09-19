import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';

// App Screens
import LandingPage from './screens/LandingPage.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Income from './screens/Income.jsx';
import Expenses from './screens/Expenses.jsx';
import Family from './screens/Family.jsx';
import Goals from './screens/Goals.jsx';
import NetWorth from './screens/NetWorth.jsx';
import Settings from './screens/Settings.jsx';

// Protected Route Wrapper
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

  if (loading) return <div className="loading-screen">Loading Anchor...</div>;

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

// Main App Layout (Sidebar + Content)
function AppLayout() {
  const [activeScreen, setScreen] = useState('dashboard');
  const location = useLocation();

  // Sync sidebar with URL if needed, or keep internal state
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
      </main>
    </div>
  );
}

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}