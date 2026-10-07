import React, { createContext, useContext, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const STORAGE_KEY = 'hideBalance';

const BalanceVisibilityContext = createContext(null);

// Holds one shared "hidden" flag for the whole app and remembers it across refreshes
export function BalanceVisibilityProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setHidden((h) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(!h));
      } catch {
        // Storage unavailable: the toggle still works for this session
      }
      return !h;
    });

  return (
    <BalanceVisibilityContext.Provider value={{ hidden, toggle }}>
      {children}
    </BalanceVisibilityContext.Provider>
  );
}

export const useBalanceVisibility = () => useContext(BalanceVisibilityContext);

// Wrap any money value: <Amount value={formatNaira(total)} />
// The mask has a fixed width so it never hints at how large the number is
export function Amount({ value, mask = '••••••' }) {
  const { hidden } = useBalanceVisibility();
  return <span>{hidden ? mask : value}</span>;
}

// Eye button: tap to hide or show every <Amount> in the app
export function EyeToggle() {
  const { hidden, toggle } = useBalanceVisibility();
  return (
    <button
      type="button"
      className="eye-btn"
      onClick={toggle}
      aria-label={hidden ? 'Show balance' : 'Hide balance'}
      aria-pressed={hidden}
    >
      {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );
}