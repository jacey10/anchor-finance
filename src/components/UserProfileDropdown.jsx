import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function UserProfileDropdown({ onNavigate, onLogout }) {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Keep the avatar in sync when the profile photo is changed on the Profile screen
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user);
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      subscription.unsubscribe();
    };
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;

  // If a new photo is set, give the image another chance to load
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <div className="user-profile-container" ref={dropdownRef}>
      {/* The Avatar Button in the Sidebar */}
      <button className="avatar-btn" onClick={() => setIsOpen(!isOpen)}>
        {/* Neutral empty circle until the user has loaded, then photo or initial */}
        <div className={`avatar-circle${user ? '' : ' avatar-circle-loading'}`}>
          {user && (avatarUrl && !imgFailed
            ? <img className="avatar-img" src={avatarUrl} alt="" onError={() => setImgFailed(true)} />
            : initial)}
        </div>
      </button>

      {/* The Glassy Dropdown Menu */}
      {isOpen && (
        <div className="glassy-dropdown">
          <div className="dropdown-header">
            <p className="dropdown-email">{user?.email}</p>
          </div>
          
          <button className="dropdown-item" onClick={() => { onNavigate('profile'); setIsOpen(false); }}>
            Profile
          </button>
          <button className="dropdown-item" onClick={() => { onNavigate('settings'); setIsOpen(false); }}>
            Settings
          </button>
          
          <div className="dropdown-divider"></div>
          
          <button className="dropdown-item logout-btn" onClick={() => { onLogout(); setIsOpen(false); }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
