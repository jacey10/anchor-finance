import React from 'react';
import { formatNaira, formatUSD } from '../lib/format';

export default function TransactionRow({ transaction, onDelete }) {
  const formattedAmount = transaction.currency === 'USD' 
    ? formatUSD(transaction.amount) 
    : formatNaira(transaction.amount);

  // V2 FIX: Safely parse the fee to ensure it renders correctly
  const feeAmount = Number(transaction.fee) || 0;
  const formattedFee = feeAmount > 0 
    ? (transaction.currency === 'USD' ? formatUSD(feeAmount) : formatNaira(feeAmount))
    : null;

  const title = transaction.type === 'bank_fee' 
    ? 'Bank Fee' 
    : (transaction.category || transaction.person || transaction.source || 'Transaction');

  return (
    <div className="list-row">
      <div className="list-row-content">
        <div className="list-row-title">
          {title}
          {transaction.impulse && <span className="tag-impulse">Impulse</span>}
          {transaction.goal_id && <span className="tag-goal"> Goal</span>}
        </div>
        
        {transaction.support_type && (
          <span 
            className="support-type-badge" 
            style={{display: 'block', marginTop: 4, marginLeft: 0, fontSize: 11, color: 'var(--accent-gold)' }}
          >
            • {transaction.support_type}
          </span>
        )}
        
        <div className="list-row-meta">
          {transaction.date}
          {/* V2 FIX: Render the fee if it exists */}
          {formattedFee && ` · Bank charge: ${formattedFee}`}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </div>
      </div>
      
      <div className="list-row-actions">
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