import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Target,
  LineChart,
  Landmark,
  Lightbulb,
  Settings,
  HelpCircle,
  User
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
  { key: 'networth', label: 'Net Worth', icon: Landmark },
  { key: 'insights', label: 'Insights', icon: Lightbulb }
];

const SECONDARY_ITEMS = [
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help & support', icon: HelpCircle }
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

      {/* Smaller Workspace Label */}
      <div className="sidebar-section-label">WORKSPACE</div>

      {/* MAIN NAVS */}
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
                  {item.key === 'investments' && <span className="pro-badge">PRO</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* DIVIDER: Strictly between main and secondary navs */}
      <div className="sidebar-divider" />

      {/* SECONDARY NAVS */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {SECONDARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  className="sidebar-nav-item"
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

      <div className="sidebar-footer">
        {/* Wrapped in pro-member-card for identical styling */}
        <div className="pro-member-card">
          <div className="pro-card-header">
            <User size={18} className="pro-card-icon" />
            <span className="pro-card-title">Personal account</span>
          </div>
          <div className="pro-card-status">
            <span className="pro-card-text" style={{ margin: 0 }}>Free plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}