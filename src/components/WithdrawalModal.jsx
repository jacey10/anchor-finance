import React, { useState, useEffect } from 'react';
import { formatNaira, formatUSD } from '../lib/format';
import Modal from './Modal';
import { addTransaction, updateGoal } from '../lib/storage';

export default function WithdrawalModal({ 
  goal, 
  accounts, 
  isOpen, 
  onClose, 
  onSuccess, 
  initialAmount = '', 
  initialDate = new Date().toISOString().slice(0, 10) 
}) {
  const [amount, setAmount] = useState(initialAmount);
  const [account_id, setAccountId] = useState('');
  const [date, setDate] = useState(initialDate);
  const [note, setNote] = useState('');

  // Reset or prefill form when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount !== '' ? String(initialAmount) : String(Number(goal?.current) || 0));
      setAccountId('');
      setDate(initialDate);
      setNote('');
    }
  }, [isOpen, initialAmount, initialDate, goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    const goalBalance = Number(goal?.current) || 0;

    if (!parsedAmount || parsedAmount <= 0) return;
    if (parsedAmount > goalBalance) {
      alert(`Amount exceeds goal balance. Available: ${formatNaira(goalBalance)}`);
      return;
    }
    if (!account_id) return;

    try {
      const transaction = await addTransaction({
        type: 'goal_withdrawal',
        category: 'Goal Withdrawal',
        amount: parsedAmount,
        date: date,
        note: note || `Withdrawn from ${goal?.name}`,
        impulse: false,
        goal_id: goal.id,
        account_id: account_id
      });

      // Update goal current balance locally (Pattern A: caller owns the update to avoid double-deduction)
      const newCurrent = Math.max(0, (goal.current || 0) - parsedAmount);
      await updateGoal(goal.id, { current: newCurrent });

      // Note: In a real app, you might want to pass a refresh callback, but we'll let the parent handle it via onSuccess

      onSuccess(transaction);
    } catch (error) {
      console.error('Withdrawal failed:', error);
      alert('Failed to process withdrawal. Please try again.');
    }
  };

  if (!goal) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Withdraw from ${goal.name}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
          Move money from this goal back to your bank account. Your total Net Worth will not change.
        </p>
        <label className="form-label">
          Amount to Withdraw
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="form-input"
            max={Number(goal.current) || 0}
            required
          />
          <span style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4, display: 'block' }}>
            Available: {formatNaira(Number(goal.current) || 0)}
          </span>
        </label>
        <label className="form-label">
          Transfer To Account
          <select 
            value={account_id} 
            onChange={(e) => setAccountId(e.target.value)} 
            className="form-select" 
            required
          >
            <option value="">Select an account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency === 'NGN' ? `₦${Number(acc.balance).toLocaleString()}` : `$${Number(acc.balance).toLocaleString()}`})
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Date
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="form-input" 
            required 
          />
        </label>
        <label className="form-label">
          Note (Optional)
          <input 
            type="text" 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            className="form-input" 
            placeholder="e.g. Withdrew remaining balance" 
          />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Confirm Withdrawal</button>
        </div>
      </form>
    </Modal>
  );
}