import React, { useState, useMemo } from 'react';
import { formatNaira, formatUSD } from '../lib/format';
import TransactionRow from './TransactionRow';
import Pagination from './Pagination';
import usePagination from '../lib/usePagination';

export default function LogTab({
  allTransactions,
  filteredTransactions,
  categories,
  familyTypes = [],
  goals = [],
  accounts = [],
  currentMonth,
  type,
  onAdd,
  onDelete,
  onBeforeAdd,
  view = 'all', // 'all' (original layout) | 'entries' | 'variance'
  filterSlot = null, // optional node rendered between the goal banner and Recent Entries
  pageResetKey // optional: when this changes, Recent Entries goes back to page 1 (defaults to the month)
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: categories[0]?.name || '',
    support_type: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    impulse: false,
    sourceType: 'bank', // 'bank' or 'goal'
    account_id: '',
    goal_id: ''
  });

  // Pagination: 7 entries per page
  const pager = usePagination(filteredTransactions, pageResetKey ?? currentMonth);

  const monthlyTransactions = useMemo(() => {
    return allTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [allTransactions, currentMonth]);

  const byCategory = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.name] = 0; });
    monthlyTransactions.forEach(t => {
      if (map[t.category] !== undefined) map[t.category] += t.amount;
    });
    return map;
  }, [monthlyTransactions, categories]);

  // V2 FIX: Restored the goal-funded spending calculation
  const goalFundedTotal = useMemo(() => {
    return monthlyTransactions
      .filter(tx => tx.goal_id)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [monthlyTransactions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = Number(formData.amount);
    if (!parsed || parsed <= 0) return;

    // V2 FIX: Validation for insufficient funds
    if (formData.sourceType === 'bank' && formData.account_id) {
      const acc = accounts.find(a => String(a.id) === String(formData.account_id));
      if (acc && parsed > acc.balance) {
        alert(`Amount exceeds account balance. Available: ${acc.currency === 'NGN' ? formatNaira(acc.balance) : formatUSD(acc.balance)}`);
        return;
      }
    } else if (formData.sourceType === 'goal' && formData.goal_id) {
      const goal = goals.find(g => String(g.id) === String(formData.goal_id));
      if (goal && parsed > goal.current) {
        alert(`Amount exceeds goal balance. Available: ${formatNaira(goal.current)}`);
        return;
      }
    }

    if (onBeforeAdd) {
      const shouldProceed = onBeforeAdd({ ...formData, amount: parsed });
      if (!shouldProceed) return;
    }

    onAdd({
      ...formData,
      amount: parsed,
      type,
      support_type: formData.support_type || null,
      impulse: formData.impulse || false,
      account_id: formData.sourceType === 'bank' ? formData.account_id : null,
      goal_id: formData.sourceType === 'goal' ? formData.goal_id : null
    });

    setFormData({ 
      ...formData, 
      amount: '', 
      note: '', 
      support_type: '', 
      account_id: '', 
      goal_id: '' 
    });
    setShowForm(false);
  };

  const showVariance = view === 'all' || view === 'variance';
  const showEntries = view === 'all' || view === 'entries';

  return (
    <div className="log-tab">
      {showVariance && (
        <>
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
        </>
      )}

      {showEntries && (
        <>
          {/* V2 FIX: Restored the Goal Summary Banner */}
          {goalFundedTotal > 0 && (
            <div className="goal-summary-banner" style={{ marginTop: 16, marginBottom: 16, padding: '12px 16px', background: 'rgba(184, 147, 95, 0.1)', borderRadius: 8, border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', fontWeight: 600, fontSize: 14 }}>
              🎯 Goal-funded spending this month: {formatNaira(goalFundedTotal)}
            </div>
          )}

          {filterSlot}

          <h2 className="section-title" style={{ marginTop: view === 'all' ? 32 : 20 }}>Recent Entries</h2>
          <div className="list-wrap">
            {filteredTransactions.length === 0 && (
              <p className="hint-text">Nothing logged in this period.</p>
            )}
            {pager.pageItems.map(tx => (
              <TransactionRow key={tx.id} transaction={tx} onDelete={onDelete} />
            ))}
          </div>

          <Pagination
            page={pager.page}
            totalPages={pager.totalPages}
            totalItems={pager.totalItems}
            onChange={pager.setPage}
          />
        </>
      )}

      {showEntries && (showForm ? (
        <form onSubmit={handleSubmit} className="form-card">
          <label className="form-label">
            Category / Person
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="form-select"
            >
              {categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* V2 UPDATE: Unified Source Selection (Option 1: Segmented Pill Control) */}
          <div className="form-label" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>Pay From</span>
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-secondary, #f4f4f5)', 
              borderRadius: 8, 
              padding: 4,
              gap: 4
            }}>
              {['bank', 'goal'].map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setFormData({ ...formData, sourceType: source, account_id: '', goal_id: '' })}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all 0.2s ease',
                    background: formData.sourceType === source ? 'var(--accent-gold)' : 'transparent',
                    color: formData.sourceType === source ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {source === 'bank' ? '🏦 Bank Account' : '🎯 Goal Savings'}
                </button>
              ))}
            </div>
          </div>

          {formData.sourceType === 'bank' && (
            <label className="form-label">
              Select Account
              <select
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Choose an account</option>
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
          )}

          {formData.sourceType === 'goal' && (
            <label className="form-label">
              Select Goal
              <select
                value={formData.goal_id}
                onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Choose a goal</option>
                {goals.filter(g => g.current > 0 && !g.is_paid).map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatNaira(g.current)} available)
                  </option>
                ))}
              </select>
              {goals.filter(g => g.current > 0 && !g.is_paid).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4, display: 'block' }}>
                  No active goals with funds available.
                </span>
              )}
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
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Log Entry
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="btn btn-outline" style={{ marginTop: 20 }}>
          + Add New Entry
        </button>
      ))}
    </div>
  );
}