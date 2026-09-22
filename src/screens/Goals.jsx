import React, { useState, useEffect } from 'react';
import { getGoals, addGoal, updateGoal, deleteGoal, addTransaction } from '../lib/storage';
import GoalRow from '../components/GoalRow';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', target: '', deadline: '' });
  
  // Modal States
  const [editingGoal, setEditingGoal] = useState(null);
  const [payingGoal, setPayingGoal] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  
  // Form Data for Modals
  const [payForm, setPayForm] = useState({ 
    amount: '', 
    date: new Date().toISOString().slice(0, 10), 
    note: '' 
  });
  const [editForm, setEditForm] = useState({ 
    name: '', 
    target: '', 
    deadline: '' 
  });

  useEffect(() => { 
    loadGoals(); 
  }, []);

  const loadGoals = async () => {
    const data = await getGoals();
    setGoals(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await addGoal({ ...addForm, target: Number(addForm.target) });
    await loadGoals();
    setShowAddForm(false);
    setAddForm({ name: '', target: '', deadline: '' });
  };

  const openEdit = (goal) => {
    setEditForm({ 
      name: goal.name, 
      target: String(goal.target), 
      deadline: goal.deadline || '' 
    });
    setEditingGoal(goal);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await updateGoal(editingGoal.id, {
      name: editForm.name,
      target: Number(editForm.target),
      deadline: editForm.deadline || null
    });
    await loadGoals();
    setEditingGoal(null);
  };

  const openPay = (goal) => {
    const remaining = goal.target - goal.current;
    setPayForm({
      amount: String(remaining > 0 ? remaining : goal.target),
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setPayingGoal(goal);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return;
    
    // FIX: Changed type to 'goal_transfer' so it doesn't reduce Net Worth.
    // Added goal_id so deleting the transaction reverses the goal progress.
    await addTransaction({
      type: 'goal_transfer',
      category: 'Goal Payment',
      amount: amount,
      date: payForm.date,
      note: payForm.note || `Paid for ${payingGoal.name}`,
      impulse: false,
      goal_id: payingGoal.id
    });
    
    // FIX: Cap the progress at the target so the bar can actually reach 100%
    let newCurrent = payingGoal.current + amount;
    if (newCurrent > payingGoal.target) {
      newCurrent = payingGoal.target;
    }
    
    await updateGoal(payingGoal.id, { current: newCurrent });
    await loadGoals();
    
    setPayingGoal(null);
    setPayForm({ 
      amount: '', 
      date: new Date().toISOString().slice(0, 10), 
      note: '' 
    });
  };

  const handleDeleteConfirm = async () => {
    if (deletingGoalId) {
      await deleteGoal(deletingGoalId);
      await loadGoals();
      setDeletingGoalId(null);
    }
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Goals</h1>
      <p className="screen-sub">What you're building toward.</p>
      
      <div className="goals-wrap">
        {goals.map(g => (
          <GoalRow 
            key={g.id} 
            goal={g} 
            onEdit={openEdit} 
            onDelete={(id) => setDeletingGoalId(id)} 
            onPay={openPay} 
          />
        ))}
      </div>
      
      <button 
        onClick={() => setShowAddForm(!showAddForm)} 
        className="btn btn-outline" 
        style={{ marginTop: 20 }}
      >
        + Add Goal
      </button>
      
      {showAddForm && (
        <form onSubmit={handleAdd} className="form-card">
          <label className="form-label">
            Goal Name
            <input 
              type="text" 
              value={addForm.name} 
              onChange={e => setAddForm({...addForm, name: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Target Amount
            <input 
              type="number" 
              value={addForm.target} 
              onChange={e => setAddForm({...addForm, target: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Deadline (Optional)
            <input 
              type="date" 
              value={addForm.deadline} 
              onChange={e => setAddForm({...addForm, deadline: e.target.value})} 
              className="form-input" 
            />
          </label>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Goal
            </button>
          </div>
        </form>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">
            Name
            <input 
              type="text" 
              value={editForm.name} 
              onChange={e => setEditForm({...editForm, name: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Target
            <input 
              type="number" 
              value={editForm.target} 
              onChange={e => setEditForm({...editForm, target: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Deadline
            <input 
              type="date" 
              value={editForm.deadline} 
              onChange={e => setEditForm({...editForm, deadline: e.target.value})} 
              className="form-input" 
            />
          </label>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setEditingGoal(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update
            </button>
          </div>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal isOpen={!!payingGoal} onClose={() => setPayingGoal(null)} title={`Pay towards ${payingGoal?.name}`}>
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
            This will move money into your goal fund. Your total Net Worth will not change.
          </p>
          <label className="form-label">
            Amount to Pay
            <input 
              type="number" 
              value={payForm.amount} 
              onChange={e => setPayForm({...payForm, amount: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Date
            <input 
              type="date" 
              value={payForm.date} 
              onChange={e => setPayForm({...payForm, date: e.target.value})} 
              className="form-input" 
              required 
            />
          </label>
          <label className="form-label">
            Note (Optional)
            <input 
              type="text" 
              value={payForm.note} 
              onChange={e => setPayForm({...payForm, note: e.target.value})} 
              className="form-input" 
              placeholder="e.g. Paid first installment" 
            />
          </label>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => setPayingGoal(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={!!deletingGoalId} 
        onClose={() => setDeletingGoalId(null)} 
        onConfirm={handleDeleteConfirm} 
        message="Are you sure you want to delete this goal? This cannot be undone." 
      />
    </div>
  );
}