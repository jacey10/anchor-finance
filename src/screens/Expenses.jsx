import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCategories, getTransactions, addTransaction, deleteTransaction, getGoals, getAccounts, getSetting } from '../lib/storage';
import { calculateNetWorth } from '../lib/calculations';
import BaselineTab from '../components/BaselineTab';
import LogTab from '../components/LogTab';
import MonthPicker from '../components/MonthPicker';

export default function Expenses() {
  const [tab, setTab] = useState('baseline');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    const loadData = async () => {
      const [allTxs, expenseTxs, g, accs, rate] = await Promise.all([
        getTransactions(),
        getTransactions({ type: 'expense' }),
        getGoals(),
        getAccounts(),
        getSetting('exchange_rate')
      ]);
      const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, g);
      setCategories(await getCategories());
      setTransactions(expenseTxs);
      setGoals(g);
      setAccounts(netWorthData.accounts);
    };
    loadData();
  }, []);

  const handleAddCategory = async () => {
    const name = prompt('Enter new expense category name (e.g., Groceries, Transport):');
    if (!name || name.trim() === '') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('categories').insert([{ name: name.trim(), user_id: user.id, baseline: 0 }]);
    if (error) { alert('Error adding category: ' + error.message); return; }
    setCategories(await getCategories()); 
  };

  const handleDeleteCategory = async (name) => {
    if (!window.confirm(`Are you sure you want to delete the "${name}" category?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('categories').delete().eq('name', name).eq('user_id', user.id);
    if (error) { alert('Error deleting category: ' + error.message); return; }
    setCategories(await getCategories());
  };

  const handleAdd = async (tx) => {
    await addTransaction({ ...tx, type: 'expense' });
    
    const [allTxs, expenseTxs, newGoals, newAccs, rate] = await Promise.all([
      getTransactions(), 
      getTransactions({ type: 'expense' }),
      getGoals(),
      getAccounts(),
      getSetting('exchange_rate')
    ]);

    const netWorthData = calculateNetWorth(allTxs, newAccs, rate || 1, null, newGoals);
    setTransactions(expenseTxs);
    setGoals(newGoals);
    setAccounts(netWorthData.accounts);
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleUpdateBaseline = async (categoryName, amount) => {
    setCategories(categories.map(c => c.name === categoryName ? { ...c, baseline: amount } : c));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('categories').update({ baseline: amount }).eq('name', categoryName).eq('user_id', user.id);
    if (error) { console.error('Error updating baseline:', error.message); alert('Failed to save budget to database.'); }
  };

  // Changing month clears the date range so it can't point at a different month
  const handleMonthChange = (month) => {
    setCurrentMonth(month);
    setDateFilter({ start: '', end: '' });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!tx.date.startsWith(currentMonth)) return false;
    if (!dateFilter.start && !dateFilter.end) return true;
    const txDate = new Date(tx.date);
    const start = dateFilter.start ? new Date(dateFilter.start) : new Date('1970-01-01');
    const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31');
    return txDate >= start && txDate <= end;
  });

  return (
    <div className="screen">
      <h1 className="screen-title">Expenses</h1>
      <p className="screen-sub">Your floor, and what actually happened.</p>
      <div className="tab-row">
        <button className={`tab-button ${tab === 'baseline' ? 'active' : ''}`} onClick={() => setTab('baseline')}>Baseline</button>
        <button className={`tab-button ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Log</button>
        <button className={`tab-button ${tab === 'variance' ? 'active' : ''}`} onClick={() => setTab('variance')}>Variance</button>
      </div>
      {tab !== 'baseline' && (
        <MonthPicker currentMonth={currentMonth} onChange={handleMonthChange} />
      )}
      {tab === 'baseline' ? (
        <BaselineTab 
          items={categories.map(c => ({ key: c.name, name: c.name, value: c.baseline || 0 }))} 
          onUpdate={handleUpdateBaseline} 
          total={categories.reduce((sum, c) => sum + (c.baseline || 0), 0)} 
          totalLabel="Total monthly expense budget"
          onAdd={handleAddCategory}
          addButtonText="+ Add Expense Category"
          onDelete={handleDeleteCategory}
        />
      ) : tab === 'log' ? (
        <LogTab 
          view="entries"
          allTransactions={transactions} 
          filteredTransactions={filteredTransactions} 
          categories={categories} 
          goals={goals}
          accounts={accounts}
          currentMonth={currentMonth}
          type="expense" 
          onAdd={handleAdd} 
          onDelete={handleDelete} 
          filterSlot={
            <div className="form-card" style={{ marginBottom: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
              <label className="form-label" style={{ flex: 1, minWidth: 120 }}>Date From
                <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} className="form-input" />
              </label>
              <label className="form-label" style={{ flex: 1, minWidth: 120 }}>Date To
                <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} className="form-input" />
              </label>
              <button className="btn btn-ghost" onClick={() => setDateFilter({ start: '', end: '' })} style={{ height: 42 }}>Clear Filter</button>
            </div>
          }
        />
      ) : (
        <LogTab 
          view="variance"
          allTransactions={transactions} 
          filteredTransactions={filteredTransactions} 
          categories={categories} 
          goals={goals}
          accounts={accounts}
          currentMonth={currentMonth}
          type="expense" 
          onAdd={handleAdd} 
          onDelete={handleDelete} 
        />
      )}
    </div>
  );
}