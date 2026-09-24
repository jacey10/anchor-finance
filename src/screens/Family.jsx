import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPeople, getTransactions, addTransaction, deleteTransaction } from '../lib/storage';
import BaselineTab from '../components/BaselineTab';
import LogTab from '../components/LogTab';
import OverageWarning from '../components/OverageWarning';

export default function Family() {
  const [tab, setTab] = useState('budget');
  const [people, setPeople] = useState([]);
  const [familyTypes, setFamilyTypes] = useState([]); // NEW: State for support types
  const [transactions, setTransactions] = useState([]);
  const [warning, setWarning] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    const loadData = async () => {
      setLoading(true); // Start loading
      
      const [ppl, txs, { data: typesData }] = await Promise.all([
        getPeople(),
        getTransactions({ type: 'family_support' }),
        supabase.from('family_types').select('*').order('name') // NEW: Fetch types
      ]);
      
      setPeople(ppl);
      setTransactions(txs);
      setFamilyTypes(typesData || []); // NEW: Set types
      setLoading(false); // Stop loading
    };
    
    loadData();
  }, []);

  // Function to add a new family member
  const handleAddFirstMember = async () => {
    const name = prompt('Enter the name of the family member:');
    if (!name || name.trim() === '') return;
    
    const budgetInput = prompt('Enter monthly budget amount (e.g., 10000):');
    if (!budgetInput || isNaN(budgetInput)) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('people')
      .insert([
        { 
          name: name.trim(), 
          budget: Number(budgetInput),
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) {
      alert('Error adding member: ' + error.message);
      return;
    }
    
    // Refresh the list
    const updatedPeople = await getPeople();
    setPeople(updatedPeople);
  };

  const handleUpdateBudget = async (name, newBudget) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('people')
      .update({ budget: newBudget })
      .eq('name', name)
      .eq('user_id', user.id);
    
    if (error) {
      alert('Error updating budget: ' + error.message);
      return;
    }
    
    // Refresh the list
    const updatedPeople = await getPeople();
    setPeople(updatedPeople);
  };

  const handleAdd = async (tx) => {
    await addTransaction({ ...tx, type: 'family_support' });
    const newTxs = await getTransactions({ type: 'family_support' });
    setTransactions(newTxs);
  };

  const handleBeforeAdd = (tx) => {
    const person = people.find(p => p.name === tx.category);
    
    if (person) {
      const alreadyGiven = transactions
        .filter(t => t.person === person.name && t.date.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (alreadyGiven + tx.amount > person.budget) {
        setPendingTx(tx);
        setWarning({ 
          person: person.name, 
          cap: person.budget, 
          alreadyGiven, 
          parsed: tx.amount, 
          over: (alreadyGiven + tx.amount) - person.budget 
        });
        return false;
      }
    }
    
    return true;
  };

  const handleDeleteMember = async (name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your family support list?`)) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Delete from Supabase
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('name', name)
      .eq('user_id', user.id);
    
    if (error) {
      alert('Error deleting member: ' + error.message);
      return;
    }
    
    // Refresh the list
    const updatedPeople = await getPeople();
    setPeople(updatedPeople);
  };

  const handleConfirmOverage = async () => {
    if (pendingTx) {
      await addTransaction({ ...pendingTx, type: 'family_support' });
      const newTxs = await getTransactions({ type: 'family_support' });
      setTransactions(newTxs);
      setPendingTx(null);
      setWarning(null);
    }
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    const newTxs = await getTransactions({ type: 'family_support' });
    setTransactions(newTxs);
  };

  // 1. Show Loading Spinner (Prevents the flash)
  if (loading) {
    return (
      <div className="screen">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading family data...</p>
        </div>
      </div>
    );
  }

  // 2. Show Empty State (Only if loading is done and no people exist)
  if (people.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Family Support</h1>
        <p className="screen-sub">What you can give this month, by person.</p>
        <div className="empty-state">
          <div className="empty-icon">👨‍👧</div>
          <h3 className="empty-title">No family members added yet</h3>
          <p className="empty-subtitle">
            Use this space to track financial support for parents, siblings, or children. 
            If you don't need this feature, you can simply ignore this tab!
          </p>
          <button 
            className="btn btn-primary" 
            onClick={handleAddFirstMember}
          >
            Add your first member
          </button>
        </div>
      </div>
    );
  }

  // 3. Show Normal Content
  return (
    <div className="screen">
      <div className="section-header">
        <h1 className="screen-title">Family Support</h1>
        <p className="screen-sub">What you can give this month, by person.</p>
      </div>
      
      <div className="tab-row">
        <button 
          className={`tab-button ${tab === 'budget' ? 'active' : ''}`} 
          onClick={() => setTab('budget')}
        >
          Budget
        </button>
        <button 
          className={`tab-button ${tab === 'given' ? 'active' : ''}`} 
          onClick={() => setTab('given')}
        >
          Given
        </button>
      </div>

      {tab === 'budget' ? (
        <div>
          <div className="add-member-row">
            <button 
              className="btn btn-primary btn-small" 
              onClick={handleAddFirstMember}
            >
              + Add Member
            </button>
          </div>
          <BaselineTab 
            items={people.map(p => ({ key: p.name, name: p.name, value: p.budget || 0 }))} 
            onUpdate={handleUpdateBudget}
            total={people.reduce((sum, p) => sum + (p.budget || 0), 0)} 
            totalLabel="Total family support budget"
            onDelete={handleDeleteMember}
          />
        </div>
      ) : (
        
        <LogTab 
          allTransactions={transactions}
          filteredTransactions={transactions} 
          currentMonth={new Date().toISOString().slice(0, 7)} // e.g., "2026-09"
          categories={people.map(p => ({ name: p.name, baseline: p.budget }))} 
          familyTypes={familyTypes} 
          goals={[]} // LogTab expects this, even if empty
          type="family_support" 
          onAdd={handleAdd} 
          onDelete={handleDelete}
          onBeforeAdd={handleBeforeAdd}
        />
      )}
      

      {warning && (
        <OverageWarning 
          isOpen={true} 
          onClose={() => { setWarning(null); setPendingTx(null); }} 
          onConfirm={handleConfirmOverage} 
          data={warning} 
        />
      )}
    </div>
  );
}