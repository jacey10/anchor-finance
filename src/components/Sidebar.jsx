import React from 'react';

export default function Sidebar({ activeScreen, setScreen }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'income', label: 'Income' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'family', label: 'Family' },
    { key: 'goals', label: 'Goals' },
    { key: 'networth', label: 'Net Worth' },
    { key: 'settings', label: 'Settings' },
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
    </nav>
  );
}