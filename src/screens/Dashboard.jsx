import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getGoals, getSetting, updateGoal, addTransaction, deleteGoal } from '../lib/storage';
import { calculateNetWorth, calculateMonthlySummary } from '../lib/calculations';
import { formatNaira } from '../lib/format';
import GoalRow from '../components/GoalRow';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Dashboard() {
  const [data, setData] = useState({ netWorth: 0, income: 0, expenses: 0, goals: [] });
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [payingGoal, setPayingGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  
  // Form Data
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [editForm, setEditForm] = useState({ name: '', target: '', deadline: '' });

  useEffect(() => {
    const loadData = async () => {
      const [transactions, goals, startingBalance, exchangeRate] = await Promise.all([
        getTransactions(), getGoals(), getSetting('starting_balance'), getSetting('exchange_rate'),
      ]);

      const currentMonth = new Date().toISOString().slice(0, 7);
      const summary = calculateMonthlySummary(transactions, currentMonth);
      const netWorthData = calculateNetWorth(transactions, startingBalance, exchangeRate);

      const trendData = [
        { month: 'Apr', value: 420000 }, 
        { month: 'Sep', value: netWorthData.total },
      ];

      setData({
        netWorth: netWorthData.total,
        income: summary.income,
        expenses: summary.totalOutflow,
        goals,
        trend: trendData,
      });
      setLoading(false);
    };
    loadData();
  }, []);

  const refreshData = async () => {
    const goals = await getGoals();
    const transactions = await getTransactions();
    const [startingBalance, exchangeRate] = await Promise.all([getSetting('starting_balance'), getSetting('exchange_rate')]);
    const netWorthData = calculateNetWorth(transactions, startingBalance, exchangeRate);
    const summary = calculateMonthlySummary(transactions, new Date().toISOString().slice(0, 7));
    setData(prev => ({ ...prev, goals, netWorth: netWorthData.total, income: summary.income, expenses: summary.totalOutflow }));
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0 || !payingGoal) return;

    await addTransaction({ 
      type: 'expense', 
      category: 'Goal Payment', 
      amount, 
      date: payForm.date, 
      note: payForm.note || `Paid for ${payingGoal.name}`, 
      impulse: false 
    });

    // Add to progress, reset to 0 if target is reached
    let newCurrent = payingGoal.current + amount;
    if (newCurrent >= payingGoal.target) {
      newCurrent = 0;
    }

    await updateGoal(payingGoal.id, { current: newCurrent });
    
    await refreshData();
    setPayingGoal(null);
    setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await updateGoal(editingGoal.id, { name: editForm.name, target: Number(editForm.target), deadline: editForm.deadline || null });
    await refreshData();
    setEditingGoal(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingGoalId) {
      await deleteGoal(deletingGoalId);
      await refreshData();
      setDeletingGoalId(null);
    }
  };

  if (loading) return <div className="loading">Loading your finances...</div>;

  return (
    <div className="screen">
      <header className="page-header">
        <p className="eyebrow">Where things stand</p>
        <h1 className="hero-number">{formatNaira(data.netWorth)}</h1>
        <p className="hero-sub">Total Net Worth</p>
      </header>

      <section className="grid-two">
        <div className="summary-block">
          <p className="summary-label">Income this month</p>
          <p className="summary-value">{formatNaira(data.income)}</p>
        </div>
        <div className="summary-block">
          <p className="summary-label">Spent this month</p>
          <p className="summary-value">{formatNaira(data.expenses)}</p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Goals in motion</h2>
        <div className="goals-wrap">
          {data.goals.map((g) => (
            <GoalRow 
              key={g.id} 
              goal={g} 
              onEdit={setEditingGoal} 
              onDelete={(id) => setDeletingGoalId(id)} 
              onPay={(goal) => {
                const remaining = goal.target - goal.current;
                setPayForm({ amount: String(remaining > 0 ? remaining : goal.target), date: new Date().toISOString().slice(0, 10), note: '' });
                setPayingGoal(goal);
              }} 
            />
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Net worth trend</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.trend}>
              <XAxis dataKey="month" stroke="#5A6B7A" tick={{ fill: '#8A98A5', fontSize: 12 }} axisLine={{ stroke: '#2A3B4D' }} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#16283C', border: '1px solid #2A3B4D', borderRadius: 4, color: '#EDE9E1' }} formatter={(value) => [formatNaira(value), 'Net worth']} />
              <Line type="monotone" dataKey="value" stroke="#B8935F" strokeWidth={2} dot={{ fill: '#B8935F', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pay Modal */}
      <Modal isOpen={!!payingGoal} onClose={() => setPayingGoal(null)} title={`Pay from ${payingGoal?.name}`}>
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">Amount <input type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Date <input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Note <input type="text" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} className="form-input" /></label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPayingGoal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">Name <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Target <input type="number" value={editForm.target} onChange={e => setEditForm({...editForm, target: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Deadline <input type="date" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className="form-input" /></label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setEditingGoal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update</button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog isOpen={!!deletingGoalId} onClose={() => setDeletingGoalId(null)} onConfirm={handleDeleteConfirm} message="Delete this goal?" />
    </div>
  );
}