import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import UserProfileDropdown from './UserProfileDropdown.jsx';

// Import the wordmarks
import wordmarkDark from '../assets/wordmark-dark.svg';
import wordmarkLight from '../assets/wordmark-light.svg';

// Returns a greeting based on the time of day
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MobileTopBar({ setScreen, onLogout }) {
  const [greeting, setGreeting] = useState(getGreeting);
  const [displayName, setDisplayName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);

  // Refresh every minute so the greeting changes without a page reload
  useEffect(() => {
    const update = () => setGreeting(getGreeting());
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  // Load the user's display name and keep it in sync when it's changed on the Profile screen
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setDisplayName(user?.user_metadata?.display_name || '');
      setNameLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setDisplayName(session.user.user_metadata?.display_name || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="mobile-top-bar">

      <Link
        to="/app/dashboard"
        className="mobile-brand"
        aria-label="Epsilon dashboard"
      >
        <img src={wordmarkDark} alt="Epsilon" className="brand-wordmark brand-wordmark-dark" />
        <img src={wordmarkLight} alt="Epsilon" className="brand-wordmark brand-wordmark-light" />
      </Link>

      <p
        className="mobile-top-bar-greeting"
        style={{ visibility: nameLoaded ? 'visible' : 'hidden' }}
      >
        {displayName ? `${greeting}, ${displayName}` : greeting}
      </p>
      
      <div className="mobile-top-bar-footer">
        <UserProfileDropdown 
          onNavigate={setScreen} 
          onLogout={onLogout} 
        />
      </div>
    </header>
  );
}