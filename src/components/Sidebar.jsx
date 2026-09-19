import React from 'react';
import UserProfileDropdown from './UserProfileDropdown.jsx';

export default function Sidebar({ activeScreen, setScreen, onLogout }) {
  // Removed 'settings' from this list
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
      <div className="brand" onClick={() => setScreen('dashboard')}>
        <span className="brand-mark">⚓</span>
        <span className="brand-name">Anchor</span>
      </div>
      
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

      {/* The New User Dropdown at the bottom */}
      <div className="sidebar-footer">
        <UserProfileDropdown 
          onNavigate={setScreen} 
          onLogout={onLogout} 
        />
      </div>
    </nav>
  );
}