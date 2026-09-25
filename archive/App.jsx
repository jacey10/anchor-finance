import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './hooks/useSession';
import { getHasAccount } from './lib/accountFlag';
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
function ProtectedRoute({ children }) {
  const { session, loading } = useSession();

  if (loading) return <div className="loading-screen" style={{ padding: 20, textAlign: 'center' }}>Loading Anchor...</div>;

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

// --- 2. ROOT ROUTE (Smart entry point for "/") ---
// Three-way check:
//   valid session      -> Dashboard
//   no session + flag  -> Auth (signin)
//   neither             -> Landing page
function RootRoute() {
  const { session, loading } = useSession();

  if (loading) return <div className="loading-screen" style={{ padding: 20, textAlign: 'center' }}>Loading Anchor...</div>;

  if (session) {
    return <Navigate to="/app" replace />;
  }

  if (getHasAccount()) {
    return <Navigate to="/signin" replace />;
  }

  return <LandingPage />;
}

// --- 3. APP LAYOUT (Sidebar + Content) ---
function AppLayout() {
  const [activeScreen, setScreen] = React.useState('dashboard');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // NOTE: hasAccount is intentionally left untouched here.
    // Logout only clears the session — the flag must survive so
    // this device still goes to /signin (not landing) next time.
    window.location.href = '/signin';
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

// --- 4. MAIN APP & ROUTING ---
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Smart entry point — session-aware */}
        <Route path="/" element={<RootRoute />} />

        {/* Always-static marketing page — for the logo click, session-agnostic.
            No session checks here at all, on purpose. */}
        <Route path="/home" element={<LandingPage />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}