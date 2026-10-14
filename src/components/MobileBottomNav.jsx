import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Target,
  LineChart,
  Landmark,
  MoreHorizontal
} from 'lucide-react';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  income: TrendingUp,
  expenses: CreditCard,
  family: Users,
  goals: Target,
  investments: LineChart,
  networth: Landmark
};

const DEFAULT_ORDER = ['dashboard', 'expenses', 'goals'];

export default function MobileBottomNav({ activeScreen, setScreen, onMoreClick }) {
  const [navOrder, setNavOrder] = React.useState(() => {
    const saved = localStorage.getItem('epsilon_nav_order');
    return saved ? JSON.parse(saved) : DEFAULT_ORDER;
  });

  const primaryItems = navOrder.slice(0, 3).map((key) => ({
    key,
    icon: ICON_MAP[key] || LayoutDashboard,
    label: key.charAt(0).toUpperCase() + key.slice(1)
  }));

  return (
    <nav className="mobile-bottom-nav">
      <ul className="bottom-nav-list">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.key;

          return (
            <li key={item.key}>
              <button
                className={`bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
                onClick={() => setScreen(item.key)}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}

        <li>
          <button
            className={`bottom-nav-item ${activeScreen === 'more' ? 'bottom-nav-item-active' : ''}`}
            onClick={onMoreClick}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}