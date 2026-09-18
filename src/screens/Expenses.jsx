import React, { useState, useEffect } from 'react';
import { getCategories, getTransactions, addTransaction, deleteTransaction } from '../lib/storage';
import { formatNaira } from '../lib/format';
import BaselineTab from '../components/BaselineTab';
import LogTab from '../components/LogTab';

export default function Expenses() {
  const [tab, setTab] = useState('baseline');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    const loadData = async () => {
      const [cats, txs] = await Promise.all([
        getCategories(), 
        getTransactions({ type: 'expense' })
      ]);
      setCategories(cats);
      setTransactions(txs);
    };
    loadData();
  }, []);

  const handleAdd = async (tx) => {
    await addTransaction({ ...tx, type: 'expense' });
    const newTxs = await getTransactions({ type: 'expense' });
    setTransactions(newTxs);
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleUpdateBaseline = async (categoryName, amount) => {
    setCategories(categories.map(c => c.name === categoryName ? { ...c, baseline: amount } : c));
  };

  // Filter transactions by date range
  const filteredTransactions = transactions.filter(tx => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const txDate = new Date(tx.date);
    const start = dateFilter.start ? new Date(dateFilter.start) : new Date('1970-01-01');
    const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31');
    return txDate >= start && txDate <= end;
  });

  const baselineObj = categories.reduce((acc, c) => ({ ...acc, [c.name]: c.baseline || 0 }), {});
  const totalBaseline = Object.values(baselineObj).reduce((a, b) => a + b, 0);

  return (
    <div className="screen">
      <h1 className="screen-title">Expenses</h1>
      <p className="screen-sub">Your floor, and what actually happened.</p>

      <div className="tab-row">
        <button className={`tab-button ${tab === 'baseline' ? 'active' : ''}`} onClick={() => setTab('baseline')}>Baseline</button>
        <button className={`tab-button ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Log</button>
      </div>

      {tab === 'baseline' ? (
        <BaselineTab 
          items={categories.map(c => ({ key: c.name, name: c.name, value: c.baseline || 0 }))} 
          onUpdate={handleUpdateBaseline} 
          total={totalBaseline} 
          totalLabel="Minimum monthly requirement" 
        />
      ) : (
        <div>
          {/* Date Range Filter */}
          <div className="form-card" style={{ marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            <label className="form-label" style={{ flex: 1, minWidth: 120 }}>
              Date From
              <input 
                type="date" 
                value={dateFilter.start} 
                onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} 
                className="form-input" 
              />
            </label>
            <label className="form-label" style={{ flex: 1, minWidth: 120 }}>
              Date To
              <input 
                type="date" 
                value={dateFilter.end} 
                onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} 
                className="form-input" 
              />
            </label>
            <button 
              className="btn btn-ghost" 
              onClick={() => setDateFilter({ start: '', end: '' })}
              style={{ height: 42 }}
            >
              Clear Filter
            </button>
          </div>

          <LogTab 
            transactions={filteredTransactions} 
            categories={categories} 
            type="expense" 
            onAdd={handleAdd} 
            onDelete={handleDelete} 
          />
        </div>
      )}
    </div>
  );
}