import React from 'react';
import { formatNaira, formatUSD } from '../lib/format';

export default function TransactionRow({ transaction, onDelete }) {
  // Determine the correct formatter based on currency
  const formattedAmount = transaction.currency === 'USD' 
    ? formatUSD(transaction.amount) 
    : formatNaira(transaction.amount);

  return (
    <div className="list-row">
      <div className="list-row-content">
        <div className="list-row-title">
          {/* FIX: Added transaction.source to the list of things to check */}
          {transaction.category || transaction.person || transaction.source}
          
          {transaction.impulse && <span className="tag-impulse">Impulse</span>}
          
          {/* FIX: Add visual badge if the expense was paid from a goal */}
          {transaction.goal_id && <span className="tag-goal"> Goal</span>}
        </div>
        
        {/* FIX: Removed the inline duplicate. Kept only the clean badge. */}
        {transaction.support_type && (
          <span 
            className="support-type-badge" 
            style={{display: 'block', marginTop: 4, marginLeft: 0, fontSize: 11, color: 'var(--accent-gold)' }}
          >
            • {transaction.support_type}
          </span>
        )}
        
        <div className="list-row-meta">
          {transaction.date}{transaction.note ? ` · ${transaction.note}` : ''}
        </div>
      </div>
      
      <div className="list-row-actions">
        {/* FIX: Use the dynamically chosen formatter */}
        <div className="list-row-amount">{formattedAmount}</div>
        <button 
          className="btn-icon-small" 
          onClick={() => onDelete(transaction.id)}
        >
          🗑
        </button>
      </div>
    </div>
  );
}