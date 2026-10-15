import React from 'react';
import { getThemePreference, setThemePreference } from '../lib/theme';

export default function ThemePickerSheet({ isOpen, onClose }) {
  if (!isOpen) return null;

  const currentTheme = getThemePreference();

  const handleSelect = (theme) => {
    setThemePreference(theme);
    onClose();
  };

  const options = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' }
  ];

  return (
    <div className="theme-picker-overlay" onClick={onClose}>
      <div className="theme-picker-card" onClick={(e) => e.stopPropagation()}>
        {options.map((option) => {
          const isActive = currentTheme === option.key;
          return (
            <button
              key={option.key}
              className={`theme-picker-row ${isActive ? 'active' : ''}`}
              onClick={() => handleSelect(option.key)}
            >
              <span className="theme-picker-label">{option.label}</span>
              <div className={`theme-toggle-switch ${isActive ? 'on' : ''}`}>
                <div className="theme-toggle-knob"></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}