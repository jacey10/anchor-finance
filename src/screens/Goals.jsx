import React, { useState, useEffect } from 'react';
import { 
  getGoals, addGoal, updateGoal, deleteGoal, addTransaction,
  getWishlistItems, addWishlistItem, updateWishlistItem, deleteWishlistItem,
  getNotes, addNote, deleteNote
} from '../lib/storage';
import GoalRow from '../components/GoalRow';
import WishlistRow from '../components/WishlistRow';
import NoteRow from '../components/NoteRow';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'wishlist' | 'notes'
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', target: '', deadline: '' });
  
  const [showAddWishForm, setShowAddWishForm] = useState(false);
  const [addWishForm, setAddWishForm] = useState({ name: '', note: '' });
  
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // Modal States
  const [editingGoal, setEditingGoal] = useState(null);
  const [payingGoal, setPayingGoal] = useState(null);
  const [deletingGoalId, setDeletingGoalId] = useState(null);
  const [deletingWishId, setDeletingWishId] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  
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
    loadWishlist();
    loadNotes();
  }, []);

  const loadGoals = async () => {
    const data = await getGoals();
    
    // FIX: Sort goals alphabetically by name (A-Z)
    const sortedData = [...data].sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    
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

  // FIX: New handlers for marking goals as paid/unpaid
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

  // FIX: Split goals into two sections based on funding status
  const activeGoals = goals.filter(g => g.current < g.target);
  const completedGoals = goals.filter(g => g.current >= g.target);

  // Split wishlist by status
  const wishingItems = wishlistItems.filter(w => w.status === 'wishing');
  const gotItems = wishlistItems.filter(w => w.status === 'got_it');

  return (
    <div className="screen">
      <h1 className="screen-title">Goals</h1>
      <p className="screen-sub">What you're building toward.</p>
      
      {/* Tab Switcher */}
      <div className="tab-row">
        <button 
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
        <button 
          className={`tab-button ${activeTab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('wishlist')}
        >
          Wishlist
        </button>
        <button 
          className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>
      
      {/* Active Tab */}
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
              />
            ))}
            {activeGoals.length === 0 && (
              <p className="hint-text">No active goals. Add one below!</p>
            )}
          </div>
          
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="btn btn-outline" 
            style={{ marginTop: '20px' }}
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
        </>
      )}
      
      {/* Completed Tab */}
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
                onPay={openPay}
                onMarkAsPaid={handleMarkAsPaid}
                onUnmarkAsPaid={handleUnmarkAsPaid}
              />
            ))}
            {completedGoals.length === 0 && (
              <p className="hint-text">No completed goals yet.</p>
            )}
          </div>
        </>
      )}
      
      {/* Wishlist Tab */}
      {activeTab === 'wishlist' && (
        <>
          <h2 className="section-title">What you're wishing for</h2>
          <div className="list-wrap">
            {wishingItems.map(item => (
              <WishlistRow 
                key={item.id} 
                item={item} 
                onMarkAsGot={handleMarkAsGot}
                onDelete={(id) => setDeletingWishId(id)}
              />
            ))}
            {wishingItems.length === 0 && (
              <p className="hint-text">Nothing on your wishlist yet. Add something below!</p>
            )}
          </div>
          
          <button 
            onClick={() => setShowAddWishForm(!showAddWishForm)} 
            className="btn btn-outline" 
            style={{ marginTop: '4px' }}
          >
            + Add to Wishlist
          </button>
          
          {showAddWishForm && (
            <form onSubmit={handleAddWish} className="form-card">
              <label className="form-label">
                Item
                <input 
                  type="text" 
                  value={addWishForm.name} 
                  onChange={e => setAddWishForm({...addWishForm, name: e.target.value})} 
                  className="form-input" 
                  required 
                />
              </label>
              <label className="form-label">
                Note (Optional)
                <input 
                  type="text" 
                  value={addWishForm.note} 
                  onChange={e => setAddWishForm({...addWishForm, note: e.target.value})} 
                  className="form-input" 
                  placeholder="e.g. after the next payday"
                />
              </label>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowAddWishForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </div>
            </form>
          )}
          
          {gotItems.length > 0 && (
            <>
              <h2 className="section-title" style={{ marginTop: '32px' }}>Got it</h2>
              <div className="list-wrap">
                {gotItems.map(item => (
                  <WishlistRow 
                    key={item.id} 
                    item={item} 
                    onUnmarkAsGot={handleUnmarkAsGot}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
      
      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <>
          <h2 className="section-title">Notes</h2>
          <div className="list-wrap">
            {notes.map(note => (
              <NoteRow 
                key={note.id} 
                note={note} 
                onDelete={(id) => setDeletingNoteId(id)}
              />
            ))}
            {notes.length === 0 && (
              <p className="hint-text">No notes yet. Jot something down below.</p>
            )}
          </div>
          
          <button 
            onClick={() => setShowAddNoteForm(!showAddNoteForm)} 
            className="btn btn-outline" 
            style={{ marginTop: '4px' }}
          >
            + Add Note
          </button>
          
          {showAddNoteForm && (
            <form onSubmit={handleAddNote} className="form-card">
              <label className="form-label">
                Note
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  className="form-input"
                  rows={4}
                  placeholder="e.g. Borrowed ₦20,000 from Chidi, Sept 12"
                  required
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowAddNoteForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Note
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog 
        isOpen={!!deletingGoalId} 
        onClose={() => setDeletingGoalId(null)} 
        onConfirm={handleDeleteConfirm} 
        message="Are you sure you want to delete this goal? This cannot be undone." 
      />
      
      <ConfirmDialog 
        isOpen={!!deletingWishId} 
        onClose={() => setDeletingWishId(null)} 
        onConfirm={handleDeleteWishConfirm} 
        message="Remove this from your wishlist? This cannot be undone." 
      />
      
      <ConfirmDialog 
        isOpen={!!deletingNoteId} 
        onClose={() => setDeletingNoteId(null)} 
        onConfirm={handleDeleteNoteConfirm} 
        message="Delete this note? This cannot be undone." 
      />
    </div>
  );
}