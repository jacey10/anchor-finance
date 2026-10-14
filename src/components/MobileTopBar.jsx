import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserProfileDropdown from './UserProfileDropdown.jsx';

// Import the wordmarks
import wordmarkDark from '../assets/wordmark-dark.svg';
import wordmarkLight from '../assets/wordmark-light.svg';

// Returns a greeting based on the time of day
function getGreeting(name) {
  const hour = new Date().getHours();

  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function MobileTopBar({ setScreen, onLogout, userName = 'JC' }) {
  const [greeting, setGreeting] = useState(() => getGreeting(userName));

  // Refresh every minute so the greeting changes without a page reload
  useEffect(() => {
    const update = () => setGreeting(getGreeting(userName));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [userName]);

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

      <p className="mobile-top-bar-greeting">{greeting}</p>
      
      <div className="mobile-top-bar-footer">
        <UserProfileDropdown 
          onNavigate={setScreen} 
          onLogout={onLogout} 
        />
      </div>
    </header>
  );
}