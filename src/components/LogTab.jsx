import React, { useState, useMemo } from 'react';
import { formatNaira, formatUSD } from '../lib/format';
import TransactionRow from './TransactionRow';

export default function LogTab({
  allTransactions,
  filteredTransactions,
  categories,
  familyTypes = [],
  goals = [],
  accounts = [],         // V2 UPDATE: Added accounts prop
  currentMonth,
  type,
  onAdd,
  onDelete,
  onBeforeAdd
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: categories[0]?.name || '',
    support_type: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    impulse: false,
    goal_id: '',
    account_id: ''       // V2 UPDATE: Added account_id to form state
  });

  const monthlyTransactions = useMemo(() => {
    return allTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [allTransactions, currentMonth]);

  const byCategory = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.name] = 0;
    });
    monthlyTransactions.forEach(t => {
      if (map[t.category] !== undefined) {
        map[t.category] += t.amount;
      }
    });
    return map;
  }, [monthlyTransactions, categories]);

  const goalFundedTotal = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.goal_id)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthlyTransactions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = Number(formData.amount);
    if (!parsed || parsed <= 0) return;
    
    if (onBeforeAdd) {
      const shouldProceed = onBeforeAdd({ ...formData, amount: parsed });
      if (!shouldProceed) return;
    }
    
    // V2 UPDATE: Include account_id in the payload
    onAdd({
      ...formData,
      amount: parsed,
      type,
      support_type: formData.support_type || null,
      goal_id: formData.goal_id || null,
      account_id: formData.account_id || null
    });
    
    setFormData({
      ...formData,
      amount: '',
      note: '',
      support_type: '',
      goal_id: '',
      account_id: ''       // V2 UPDATE: Reset account_id
    });
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
      
      {goalFundedTotal > 0 && (
        <div className="goal-summary-banner">
          🎯 Goal-funded spending this month: {formatNaira(goalFundedTotal)}
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: 32 }}>Recent Entries</h2>
      <div className="list-wrap">
        {filteredTransactions.length === 0 && (
          <p className="hint-text">Nothing logged in this period.</p>
        )}
        {filteredTransactions.map(tx => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            onDelete={onDelete}
          />
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="form-card">
          <label className="form-label">
            Category / Person
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="form-select"
            >
              {categories.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* V2 UPDATE: New Account Dropdown */}
          <label className="form-label">
            Account
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Select an account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency === 'NGN' ? formatNaira(acc.balance || acc.starting_balance) : formatUSD(acc.balance || acc.starting_balance)})
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4, display: 'block' }}>
                No accounts found. Go to Net Worth to add one.
              </span>
            )}
          </label>

          {/* V2 UPDATE: Renamed from "Pay from Goal" to "Tag with Goal" */}
          {type === 'expense' && (
            <label className="form-label">
              Tag with Goal (Optional)
              <select
                value={formData.goal_id}
                onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                className="form-select"
              >
                <option value="">None (Regular expense)</option>
                {goals
                  .filter((g) => g.current > 0 && !g.is_paid)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({formatNaira(g.current)})
                    </option>
                  ))}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Tagging will mark this goal as paid when you save
              </span>
            </label>
          )}

          {type === 'family_support' && familyTypes.length > 0 && (
            <div className="form-label">
              <span>Support Type (Optional)</span>
              <div className="support-type-chips">
                {familyTypes.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    className={`chip ${formData.support_type === t.name ? 'chip-active' : ''}`}
                    onClick={() => setFormData({ ...formData, support_type: t.name })}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="form-label">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="form-input"
              placeholder="Enter amount"
              required
            />
          </label>

          <label className="form-label">
            Date
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="form-input"
              required
            />
          </label>

          <label className="form-label">
            Note (optional)
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="form-input"
            />
          </label>

          {type === 'expense' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.impulse}
                onChange={(e) => setFormData({ ...formData, impulse: e.target.checked })}
              />
              Mark as Impulse Buy
            </label>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Log Entry
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-outline"
          style={{ marginTop: 20 }}
        >
          + Add New Entry
        </button>
      )}
    </div>
  );
}