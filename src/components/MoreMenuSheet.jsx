import React from 'react';
import {
  TrendingUp,
  Users,
  LineChart,
  Landmark,
  User,
  Settings,
  Palette,
  SlidersHorizontal,
  X
} from 'lucide-react';

const SECONDARY_ITEMS = [
  { key: 'income', label: 'Income', icon: TrendingUp },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'investments', label: 'Investments', icon: LineChart },
  { key: 'networth', label: 'Net Worth', icon: Landmark },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'settings', label: 'Settings', icon: Settings }
];

export default function MoreMenuSheet({ isOpen, onClose, setScreen, onCustomizeClick, onThemeClick }) {
  if (!isOpen) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content more-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h3>More</h3>
          <button className="sheet-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <ul className="sheet-list">
          {SECONDARY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  className="sheet-list-item"
                  onClick={() => {
                    setScreen(item.key);
                    onClose();
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.key === 'investments' && <span className="pro-badge">PRO</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="sheet-divider" />
        <ul className="sheet-list">
          <li>
            <button className="sheet-list-item" onClick={onThemeClick}>
              <Palette size={20} />
              <span>Theme</span>
            </button>
          </li>
          <li>
            <button className="sheet-list-item" onClick={onCustomizeClick}>
              <SlidersHorizontal size={20} />
              <span>Customize Menu</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}