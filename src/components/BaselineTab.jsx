import React, { useState } from 'react';
import { formatNaira } from '../lib/format';

export default function BaselineTab({ items, onUpdate, total, totalLabel }) {
  const [editingKey, setEditingKey] = useState(null);
  const [draftValue, setDraftValue] = useState('');

  const startEdit = (key, currentVal) => {
    setEditingKey(key);
    setDraftValue(String(currentVal));
  };

  const commitEdit = (key) => {
    const parsed = Number(draftValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate(key, parsed);
    }
    setEditingKey(null);
  };

  return (
    <div className="baseline-tab">
      <div className="list-wrap">
        {items.map((item) => {
          const isEditing = editingKey === item.key;
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          
          return (
            <div key={item.key} className="list-row">
              <div className="list-row-content">
                <div className="list-row-title">{item.name}</div>
                <div className="goal-bar-track">
                  <div className="goal-bar-fill-muted" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {isEditing ? (
                <input
                  autoFocus
                  type="number"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onBlur={() => commitEdit(item.key)}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit(item.key)}
                  className="inline-input"
                />
              ) : (
                <button onClick={() => startEdit(item.key, item.value)} className="editable-amount">
                  {formatNaira(item.value)}
                </button>
              )}
            </div>
          );
        })}
        <div className="total-row">
          <div className="total-row-title">{totalLabel}</div>
          <div className="total-row-amount">{formatNaira(total)}</div>
        </div>
      </div>
      <p className="hint-text">Tap any amount to set what it needs, monthly.</p>
    </div>
  );
}