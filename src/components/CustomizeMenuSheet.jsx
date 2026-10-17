import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Target,
  LineChart,
  Landmark,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';

const ALL_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'income', label: 'Income', icon: TrendingUp },
  { key: 'expenses', label: 'Expenses', icon: CreditCard },
  { key: 'family', label: 'Family', icon: Users },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'investments', label: 'Investments', icon: LineChart },
  { key: 'networth', label: 'Net Worth', icon: Landmark }
];

export default function CustomizeMenuSheet({ isOpen, onClose }) {
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem('epsilon_nav_order');
    const savedOrder = saved ? JSON.parse(saved) : ['dashboard', 'expenses', 'goals'];
    
    // Ensure all items are in the list, appending any missing ones at the end
    const fullOrder = [...savedOrder];
    ALL_ITEMS.forEach((item) => {
      if (!fullOrder.includes(item.key)) {
        fullOrder.push(item.key);
      }
    });
    return fullOrder;
  });

  const handleMove = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= order.length) return;

    const newOrder = [...order];
    const temp = newOrder[index];
    newOrder[index] = newOrder[newIndex];
    newOrder[newIndex] = temp;
    setOrder(newOrder);
  };

  const handleSave = () => {
    localStorage.setItem('epsilon_nav_order', JSON.stringify(order));
    onClose();
    // Force a reload of the bottom nav to reflect changes
    window.location.reload(); 
  };

  if (!isOpen) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content customize-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h3>Customize Menu</h3>
          <button className="sheet-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <p className="sheet-subtitle">
          Reorder items. The top 3 appear in the main bar; the rest go to "More".
        </p>

        <ul className="sheet-list customize-list">
          {order.map((key, index) => {
            const item = ALL_ITEMS.find((i) => i.key === key);
            const Icon = item.icon;
            const isPrimary = index < 3;

            return (
              <li key={key} className={`customize-item ${!isPrimary ? 'secondary-item' : ''}`}>
                <div className="customize-item-left">
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
                <div className="customize-item-actions">
                  <button
                    className="icon-btn"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${item.label} up`}
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === order.length - 1}
                    aria-label={`Move ${item.label} down`}
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="sheet-footer">
          <button className="btn btn-primary btn-full" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}