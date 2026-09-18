import React from 'react';
import { formatNaira } from '../lib/format';

export default function TransactionRow({ transaction, onDelete }) {
  return (
    <div className="list-row">
      <div className="list-row-content">
        <div className="list-row-title">
          {transaction.category || transaction.person}
          {transaction.support_type && ` · ${transaction.support_type}`}
          {transaction.impulse && <span className="tag-impulse">Impulse</span>}
        </div>
        <div className="list-row-meta">
          {transaction.date}{transaction.note ? ` · ${transaction.note}` : ''}
        </div>
      </div>
      <div className="list-row-actions">
        <div className="list-row-amount">{formatNaira(transaction.amount)}</div>
        <button className="btn-icon-small" onClick={() => onDelete(transaction.id)}>🗑</button>
      </div>
    </div>
  );
}