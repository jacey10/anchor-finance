import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Target,
  LineChart,
  Landmark
} from 'lucide-react';

// Import the wordmarks
import wordmarkDark from '../assets/wordmark-dark.svg';
import wordmarkLight from '../assets/wordmark-light.svg';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'income', label: 'Income', icon: TrendingUp },
  { key: 'expenses', label: 'Expenses', icon: CreditCard },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'investments', label: 'Investments', icon: LineChart },
  { key: 'networth', label: 'Net Worth', icon: Landmark }
];

export default function DesktopSidebar({ activeScreen, setScreen }) {
  return (
    <aside className="desktop-sidebar">

      <Link
        to="/app/dashboard"
        className="sidebar-brand"
        aria-label="Epsilon dashboard"
      >
        <img src={wordmarkDark} alt="Epsilon" className="brand-wordmark brand-wordmark-dark" />
        <img src={wordmarkLight} alt="Epsilon" className="brand-wordmark brand-wordmark-light" />
      </Link>

      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.key;

            return (
              <li key={item.key}>
                <button
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                  onClick={() => setScreen(item.key)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}