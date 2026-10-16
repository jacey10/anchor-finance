import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getThemePreference, setThemePreference } from '../lib/theme';
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
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef(null);

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

  // Close theme dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (theme) => {
    setThemePreference(theme);
    setIsThemeDropdownOpen(false);
  };

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
        
        {/* DESKTOP ONLY CONTROLS: Hidden on mobile, side-by-side on desktop */}
        <div className="desktop-topbar-controls">
          <button className="btn-icon" aria-label="Notifications">
            <Bell size={20} />
          </button>
          
          <div className="theme-dropdown-container" ref={themeDropdownRef} style={{ position: 'relative' }}>
            <button 
              className="btn-icon" 
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              aria-label="Change theme"
            >
              <Palette size={20} />
            </button>
            {isThemeDropdownOpen && (
              <div className="theme-dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '140px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000, padding: '8px' }}>
                {['light', 'dark', 'system'].map((theme) => (
                  <button
                    key={theme}
                    className={`theme-dropdown-item ${getThemePreference() === theme ? 'active' : ''}`}
                    onClick={() => handleThemeChange(theme)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: getThemePreference() === theme ? 'var(--bg-card-alt)' : 'transparent', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', textTransform: 'capitalize' }}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <UserProfileDropdown 
          onNavigate={setScreen} 
          onLogout={onLogout} 
        />
      </div>
    </header>
  );
}