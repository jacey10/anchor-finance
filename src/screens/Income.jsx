import React, { useState, useEffect } from 'react';
import { getTransactions, addTransaction, deleteTransaction } from '../lib/storage';
import { formatNaira } from '../lib/format';
import TransactionRow from '../components/TransactionRow';

const INCOME_SOURCES = ['Freelance (Web Dev)', 'Job/Internship', 'Tutoring', 'Starting Balance'];

export default function Income() {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    source: INCOME_SOURCES[0], 
    amount: '', 
    date: new Date().toISOString().slice(0, 10), 
    note: '' 
  });

  useEffect(() => { 
    getTransactions({ type: 'income' }).then(setTransactions); 
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await addTransaction({ ...formData, amount: Number(formData.amount), type: 'income' });
    const newTxs = await getTransactions({ type: 'income' });
    setTransactions(newTxs);
    setShowForm(false);
    setFormData({ source: INCOME_SOURCES[0], amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Income</h1>
      <p className="screen-sub">Every source, tracked in one place.</p>
      
      <div className="list-wrap">
        {transactions.map(tx => (
          <TransactionRow key={tx.id} transaction={tx} onDelete={handleDelete} />
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="btn btn-outline" style={{ marginTop: 20 }}>
        + Add Income
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="form-card">
          <label className="form-label">Source
            <select 
              value={formData.source} 
              onChange={e => setFormData({...formData, source: e.target.value})} 
              className="form-select" 
              required
            >
              {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="form-label">Amount
            <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="form-input" required />
          </label>
          <label className="form-label">Date
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" required />
          </label>
          <label className="form-label">Note (Optional)
            <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="form-input" placeholder="e.g. Client payment" />
          </label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Income</button>
          </div>
        </form>
      )}
    </div>
  );
}