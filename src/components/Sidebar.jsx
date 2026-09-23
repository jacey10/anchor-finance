import React from 'react';
import UserProfileDropdown from './UserProfileDropdown.jsx';
import { Link } from 'react-router-dom';

export default function Sidebar({ activeScreen, setScreen, onLogout }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'income', label: 'Income' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'family', label: 'Family' },
    { key: 'goals', label: 'Goals' },
    { key: 'networth', label: 'Net Worth' },
  ];

  return (
    <nav className="sidebar">
      {/*  1. Brand (Left on Desktop, Top-Left on Mobile) → ALWAYS goes to /home */}
      <Link to="/home" className="brand">
        <span className="brand-mark">⚓</span>
        <span className="brand-name">Anchor Vault</span>
      </Link>

      {/* 2. Navigation Wrapper (Center on Desktop, Bottom Row on Mobile) */}
      <div className="nav-scroll-container">
        <ul className="nav-list">
          {items.map((item) => (
            <li key={item.key}>
              <button
                className={`nav-item ${activeScreen === item.key ? 'nav-item-active' : ''}`}
                onClick={() => setScreen(item.key)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. User Avatar (Right on Desktop, Top-Right on Mobile) */}
      <div className="sidebar-footer">
        <UserProfileDropdown 
          onNavigate={setScreen} 
          onLogout={onLogout} 
        />
      </div>
    </nav>
  );
}