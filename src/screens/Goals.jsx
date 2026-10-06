import React, { useState, useEffect, useCallback } from 'react';

import {
  getGoals, addGoal, updateGoal, deleteGoal, addTransaction,
  getWishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem,
  getNotes, addNote, deleteNote,
  getAccounts, getTransactions, getSetting
} from '../lib/storage';

import GoalRow from '../components/GoalRow';
import WishlistRow from '../components/WishlistRow';
import NoteRow from '../components/NoteRow';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import WithdrawalModal from '../components/WithdrawalModal';
import { formatNaira, formatUSD } from '../lib/format';
import { calculateNetWorth } from '../lib/calculations';
import { useRegisterRefresh } from '../hooks/RefreshContext';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', target: '', deadline: '' });
  const [showAddWishForm, setShowAddWishForm] = useState(false);
  const [addWishForm, setAddWishForm] = useState({ name: '', note: '' });
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingGoal, setEditingGoal] = useState(null);
  const [payingGoal, setPayingGoal] = useState(null);
  const [withdrawingGoal, setWithdrawingGoal] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  const [deletingWishId, setDeletingWishId] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    account_id: '',
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
    loadWishlist();
    loadNotes();
    loadAccounts();
  }, []);

  const refreshData = useCallback(async () => {
    await loadGoals();
    await loadWishlist();
    await loadNotes();
    await loadAccounts();
  }, []);

  useRegisterRefresh(refreshData);

  const loadGoals = async () => {
    const data = await getGoals();
    const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));
    setGoals(sortedData);
  };

  const loadWishlist = async () => {
    const data = await getWishlistItems();
    setWishlistItems(data);
  };

  const loadNotes = async () => {
    const data = await getNotes();
    setNotes(data);
  };

  const loadAccounts = async () => {
    try {
      const [rawAccounts, transactions, exchangeRate] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getSetting('exchange_rate')
      ]);
      const calculatedData = calculateNetWorth(transactions, rawAccounts, exchangeRate || 1, null, goals);
      setAccounts(calculatedData.accounts);
    } catch (error) {
      console.error("Failed to load accounts with balances:", error);
      setAccounts([]);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await addGoal({ ...addForm, target: Number(addForm.target) });
    await loadGoals();
    setShowAddForm(false);
    setAddForm({ name: '', target: '', deadline: '' });
  };

  const handleAddWish = async (e) => {
    e.preventDefault();
    if (!addWishForm.name.trim()) return;
    await addWishlistItem(addWishForm);
    await loadWishlist();
    setShowAddWishForm(false);
    setAddWishForm({ name: '', note: '' });
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    await addNote(newNoteContent.trim());
    await loadNotes();
    setShowAddNoteForm(false);
    setNewNoteContent('');
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

  // V4 UPDATE: Helper to compute total funding (current + execution) for a goal
  const getFundingTotal = (goal) => {
    return (Number(goal.current) || 0) + (Number(goal.execution_total) || 0);
  };

  // ── Pay towards Goal ──
  // V4 UPDATE: "remaining" now accounts for execution_total to prevent over-funding
  const openPay = (goal) => {
    const fundingTotal = getFundingTotal(goal);
    const remaining = Math.max(0, goal.target - fundingTotal);
    setPayForm({
      amount: String(remaining > 0 ? remaining : 0),
      account_id: '',
      date: new Date().toISOString().slice(0, 10),
      note: ''
    });
    setPayingGoal(goal);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    const fundingTotal = getFundingTotal(payingGoal);
    const remaining = Math.max(0, payingGoal.target - fundingTotal);

    if (!amount || amount <= 0 || !payForm.account_id) return;

    // Enforce no over-funding
    if (amount > remaining) {
      alert(`Amount exceeds remaining target. You can only pay up to ${formatNaira(remaining)} more.`);
      return;
    }

    await addTransaction({
      type: 'goal_transfer',
      category: 'Goal Payment',
      amount: amount,
      date: payForm.date,
      note: payForm.note || `Paid for ${payingGoal.name}`,
      impulse: false,
      goal_id: payingGoal.id,
      account_id: payForm.account_id
    });

    const newCurrent = payingGoal.current + amount;
    await updateGoal(payingGoal.id, { current: newCurrent });

    await loadGoals();
    await loadAccounts();
    setPayingGoal(null);
    setPayForm({ amount: '', account_id: '', date: new Date().toISOString().slice(0, 10), note: '' });
  };

  // ── Withdraw from Goal ──
  const openWithdraw = (goal) => {
    setWithdrawingGoal(goal);
  };

  const handleWithdrawSuccess = async () => {
    await loadGoals();
    await loadAccounts();
    setWithdrawingGoal(null);
  };

  // ── Delete with safety guard ─
  const handleDeleteConfirm = async () => {
    if (deletingGoalId) {
      const goal = goals.find(g => g.id === deletingGoalId);
      if (goal && Number(goal.current) > 0) {
        alert('Cannot delete a goal with remaining balance. Please withdraw the funds first.');
        setDeletingGoalId(null);
        return;
      }
      await deleteGoal(deletingGoalId);
      await loadGoals();
      setDeletingGoalId(null);
    }
  };

  const handleDeleteWishConfirm = async () => {
    if (deletingWishId) {
      await deleteWishlistItem(deletingWishId);
      await loadWishlist();
      setDeletingWishId(null);
    }
  };

  const handleDeleteNoteConfirm = async () => {
    if (deletingNoteId) {
      await deleteNote(deletingNoteId);
      await loadNotes();
      setDeletingNoteId(null);
    }
  };

  const handleMarkAsPaid = async (goal) => {
    await updateGoal(goal.id, { is_paid: true });
    await loadGoals();
  };

  const handleUnmarkAsPaid = async (goal) => {
    await updateGoal(goal.id, { is_paid: false });
    await loadGoals();
  };

  const handleMarkAsGot = async (item) => {
    await updateWishlistItem(item.id, { status: 'got_it' });
    await loadWishlist();
  };

  const handleUnmarkAsGot = async (item) => {
    await updateWishlistItem(item.id, { status: 'wishing' });
    await loadWishlist();
  };

  // V4 UPDATE: Filter goals based on funding total (not raw current balance)
  // so fully-funded goals with executions still appear in "Completed"
  const activeGoals = goals.filter(g => getFundingTotal(g) < g.target && !g.is_paid);
  const completedGoals = goals.filter(g => getFundingTotal(g) >= g.target && !g.is_paid);
  const achievedGoals = goals.filter(g => g.is_paid);

  const wishingItems = wishlistItems.filter(w => w.status === 'wishing');
  const gotItems = wishlistItems.filter(w => w.status === 'got_it');

  return (
    <div className="screen">
      <h1 className="screen-title">Goals</h1>
      <p className="screen-sub">What you're building toward.</p>

      <div className="tab-row">
        <button className={`tab-button ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
        <button className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Completed</button>
        <button className={`tab-button ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => setActiveTab('wishlist')}>Wishlist</button>
        <button className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
      </div>

      {activeTab === 'active' && (
        <>
          <h2 className="section-title">Goals in motion</h2>
          <div className="goals-wrap">
            {activeGoals.map(g => (
              <GoalRow
                key={g.id}
                goal={g}
                onEdit={openEdit}
                onDelete={(id) => setDeletingGoalId(id)}
                onPay={openPay}
                onWithdraw={openWithdraw}
              />
            ))}
            {activeGoals.length === 0 && (
              <p className="hint-text">No active goals. Add one below!</p>
            )}
          </div>

          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-outline" style={{ marginTop: '20px' }}>+ Add Goal</button>
          {showAddForm && (
            <form onSubmit={handleAdd} className="form-card">
              <label className="form-label">Goal Name<input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="form-input" required /></label>
              <label className="form-label">Target Amount<input type="number" value={addForm.target} onChange={e => setAddForm({...addForm, target: e.target.value})} className="form-input" required /></label>
              <label className="form-label">Deadline (Optional)<input type="date" value={addForm.deadline} onChange={e => setAddForm({...addForm, deadline: e.target.value})} className="form-input" /></label>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Goal</button>
              </div>
            </form>
          )}
        </>
      )}

      {activeTab === 'completed' && (
        <>
          <h2 className="section-title">Completed goals</h2>
          <div className="goals-wrap">
            {completedGoals.map(g => (
              <GoalRow
                key={g.id}
                goal={g}
                onEdit={openEdit}
                onDelete={(id) => setDeletingGoalId(id)}
                onWithdraw={openWithdraw}
                onMarkAsPaid={handleMarkAsPaid}
                onUnmarkAsPaid={handleUnmarkAsPaid}
              />
            ))}
            {completedGoals.length === 0 && (
              <p className="hint-text">No completed goals yet.</p>
            )}
          </div>

          {achievedGoals.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: '32px' }}>Achieved</h2>
              <div className="goals-wrap">
                {achievedGoals.map(g => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    onDelete={(id) => setDeletingGoalId(id)}
                    onWithdraw={openWithdraw}
                    onMarkAsPaid={handleMarkAsPaid}
                    onUnmarkAsPaid={handleUnmarkAsPaid}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'wishlist' && (
        <>
          <h2 className="section-title">What you're wishing for</h2>
          <div className="list-wrap">
            {wishingItems.map(item => (
              <WishlistRow key={item.id} item={item} onMarkAsGot={handleMarkAsGot} onDelete={(id) => setDeletingWishId(id)} />
            ))}
            {wishingItems.length === 0 && (
              <p className="hint-text">Nothing on your wishlist yet. Add something below!</p>
            )}
          </div>
          <button onClick={() => setShowAddWishForm(!showAddWishForm)} className="btn btn-outline" style={{ marginTop: '4px' }}>+ Add to Wishlist</button>
          {showAddWishForm && (
            <form onSubmit={handleAddWish} className="form-card">
              <label className="form-label">Item<input type="text" value={addWishForm.name} onChange={e => setAddWishForm({...addWishForm, name: e.target.value})} className="form-input" required /></label>
              <label className="form-label">Note (Optional)<input type="text" value={addWishForm.note} onChange={e => setAddWishForm({...addWishForm, note: e.target.value})} className="form-input" placeholder="e.g. after the next payday" /></label>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddWishForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add</button>
              </div>
            </form>
          )}

          {gotItems.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: '32px' }}>Got it</h2>
              <div className="list-wrap">
                {gotItems.map(item => (
                  <WishlistRow key={item.id} item={item} onUnmarkAsGot={handleUnmarkAsGot} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'notes' && (
        <>
          <h2 className="section-title">Notes</h2>
          <div className="list-wrap">
            {notes.map(note => (
              <NoteRow key={note.id} note={note} onDelete={(id) => setDeletingNoteId(id)} />
            ))}
            {notes.length === 0 && (
              <p className="hint-text">No notes yet. Jot something down below.</p>
            )}
          </div>

          <button onClick={() => setShowAddNoteForm(!showAddNoteForm)} className="btn btn-outline" style={{ marginTop: '4px' }}>+ Add Note</button>
          {showAddNoteForm && (
            <form onSubmit={handleAddNote} className="form-card">
              <label className="form-label">Note<textarea value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} className="form-input" rows={4} placeholder="e.g. Borrowed 20,000 from Chidi, Sept 12" required style={{ resize: 'vertical', fontFamily: 'inherit' }} /></label>
              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddNoteForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Note</button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Edit Goal Modal */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label className="form-label">Name<input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Target<input type="number" value={editForm.target} onChange={e => setEditForm({...editForm, target: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Deadline<input type="date" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className="form-input" /></label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setEditingGoal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update</button>
          </div>
        </form>
      </Modal>

      {/* Pay towards Goal Modal */}
      {/* V4 UPDATE: max and remaining now use fundingTotal to prevent over-funding */}
      <Modal isOpen={!!payingGoal} onClose={() => setPayingGoal(null)} title={`Pay towards ${payingGoal?.name}`}>
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
            This will move money into your goal fund. Your total Net Worth will not change.
          </p>
          <label className="form-label">
            Amount to Pay
            <input
              type="number"
              value={payForm.amount}
              onChange={e => setPayForm({...payForm, amount: e.target.value})}
              className="form-input"
              max={payingGoal ? Math.max(0, payingGoal.target - getFundingTotal(payingGoal)) : 0}
              required
            />
            {payingGoal && (
              <span style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4, display: 'block' }}>
                Remaining to fund: {formatNaira(Math.max(0, payingGoal.target - getFundingTotal(payingGoal)))}
              </span>
            )}
          </label>
          <label className="form-label">
            Pay From Account
            <select value={payForm.account_id} onChange={(e) => setPayForm({ ...payForm, account_id: e.target.value })} className="form-select" required>
              <option value="">Select an account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency === 'NGN' ? `${Number(acc.balance).toLocaleString()}` : `$${Number(acc.balance).toLocaleString()}`})
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">Date<input type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="form-input" required /></label>
          <label className="form-label">Note (Optional)<input type="text" value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} className="form-input" placeholder="e.g. Paid first installment" /></label>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPayingGoal(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Confirm Payment</button>
          </div>
        </form>
      </Modal>

      {/* V3 UPDATE: Reusable Withdrawal Modal */}
      <WithdrawalModal
        goal={withdrawingGoal}
        accounts={accounts}
        isOpen={!!withdrawingGoal}
        onClose={() => setWithdrawingGoal(null)}
        onSuccess={handleWithdrawSuccess}
      />
      
      <ConfirmDialog isOpen={!!deletingGoalId} onClose={() => setDeletingGoalId(null)} onConfirm={handleDeleteConfirm} message="Are you sure you want to delete this goal? This cannot be undone." />
      <ConfirmDialog isOpen={!!deletingWishId} onClose={() => setDeletingWishId(null)} onConfirm={handleDeleteWishConfirm} message="Remove this from your wishlist? This cannot be undone." />
      <ConfirmDialog isOpen={!!deletingNoteId} onClose={() => setDeletingNoteId(null)} onConfirm={handleDeleteNoteConfirm} message="Delete this note? This cannot be undone." />
    </div>
  );
}