import React, { useState, useMemo } from 'react';
import { formatNaira } from '../lib/format';
import TransactionRow from './TransactionRow';

export default function LogTab({ 
  transactions, 
  categories, 
  type, 
  onAdd, 
  onDelete,
  onBeforeAdd // Used for OverageWarning in Family tab
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: categories[0]?.name || '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    impulse: false
  });

  // Calculate totals by category
  const byCategory = useMemo(() => {
    const map = {};
    categories.forEach(c => map[c.name] = 0);
    transactions.forEach(t => {
      if (map[t.category] !== undefined) map[t.category] += t.amount;
    });
    return map;
  }, [transactions, categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = Number(formData.amount);
    if (!parsed || parsed <= 0) return;

    // If we have an overage checker (Family tab), run it first
    if (onBeforeAdd) {
      const shouldProceed = onBeforeAdd({ ...formData, amount: parsed });
      if (!shouldProceed) return; // The warning modal will handle the actual add
    }

    onAdd({ ...formData, amount: parsed, type });
    setFormData({ ...formData, amount: '', note: '' });
    setShowForm(false);
  };

  return (
    <div className="log-tab">
      <h2 className="section-title">Actual vs. Baseline</h2>
      <div className="list-wrap">
        {categories.map(c => {
          const actual = byCategory[c.name] || 0;
          const base = c.baseline || 0;
          const over = actual > base;
          return (
            <div key={c.name} className="list-row">
              <div className="list-row-content">
                <div className="list-row-title">{c.name}</div>
                <div className="list-row-meta">baseline {formatNaira(base)}</div>
              </div>
              <div className={`list-row-amount ${over ? 'text-danger' : ''}`}>
                {formatNaira(actual)}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>Recent Entries</h2>
      <div className="list-wrap">
        {transactions.length === 0 && <p className="hint-text">Nothing logged yet this month.</p>}
        {transactions.map(tx => (
          <TransactionRow key={tx.id} transaction={tx} onDelete={onDelete} />
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="form-card">
          <label className="form-label">
            Category / Person
            <select 
              value={formData.category} 
              onChange={(e) => setFormData({...formData, category: e.target.value})} 
              className="form-select"
            >
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="form-label">
            Amount
            <input 
              type="number" 
              value={formData.amount} 
              onChange={(e) => setFormData({...formData, amount: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Date
            <input 
              type="date" 
              value={formData.date} 
              onChange={(e) => setFormData({...formData, date: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Note (optional)
            <input 
              type="text" 
              value={formData.note} 
              onChange={(e) => setFormData({...formData, note: e.target.value})} 
              className="form-input" 
            />
          </label>
          {type === 'expense' && (
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={formData.impulse} 
                onChange={(e) => setFormData({...formData, impulse: e.target.checked})} 
              />
              Mark as Impulse Buy
            </label>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Log Entry</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn btn-outline" style={{ marginTop: 20 }}>
          + Add New Entry
        </button>
      )}
    </div>
  );
}