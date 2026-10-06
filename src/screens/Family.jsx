import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

import { getPeople, getTransactions, addTransaction, deleteTransaction, getAccounts, getGoals, getSetting } from '../lib/storage'; // UPDATED: Added getGoals, getSetting

import { calculateNetWorth } from '../lib/calculations'; // ADDED: For live balance calculation
import BaselineTab from '../components/BaselineTab';
import LogTab from '../components/LogTab';
import MonthPicker from '../components/MonthPicker';
import OverageWarning from '../components/OverageWarning';
import { useRegisterRefresh } from '../hooks/RefreshContext';

export default function Family() {
  const [tab, setTab] = useState('budget');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [people, setPeople] = useState([]);
  const [familyTypes, setFamilyTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [warning, setWarning] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [ppl, allTxs, txs, accs, gls, rate, { data: typesData }] = await Promise.all([
         getPeople(),
         getTransactions(), // ADDED: Fetch all transactions for balance calculation
         getTransactions({ type: 'family_support' }),
         getAccounts(),
         getGoals(),
         getSetting('exchange_rate'),
         supabase.from('family_types').select('*').order('name')
       ]);

       const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, gls);

       setPeople(ppl);
       setTransactions(txs);
       setAccounts(netWorthData.accounts); // UPDATED: Use calculated accounts
       setGoals(gls);
       setFamilyTypes(typesData || []);
       setLoading(false);
     };

     loadData();
  }, []);

  const refreshData = useCallback(async () => {
    const [ppl, allTxs, txs, accs, gls, rate, { data: typesData }] = await Promise.all([
      getPeople(),
      getTransactions(), // ADDED: Fetch all transactions for balance calculation
      getTransactions({ type: 'family_support' }),
      getAccounts(),
      getGoals(),
      getSetting('exchange_rate'),
      supabase.from('family_types').select('*').order('name')
    ]);

    const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, gls);
    setPeople(ppl);
    setTransactions(txs);
    setAccounts(netWorthData.accounts); // UPDATED: Use calculated accounts
    setGoals(gls);
    setFamilyTypes(typesData || []);
  }, []);

  useRegisterRefresh(refreshData);

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

    const updatedPeople = await getPeople();
    setPeople(updatedPeople);
  };

  const handleAdd = async (tx) => {
    await addTransaction({ ...tx, type: 'family_support' });
    const [ppl, allTxs, txs, accs, gls, rate] = await Promise.all([
      getPeople(),
      getTransactions(),
      getTransactions({ type: 'family_support' }),
      getAccounts(),
      getGoals(),
      getSetting('exchange_rate')
    ]);
    
    const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, gls);
    setPeople(ppl);
    setTransactions(txs);
    setAccounts(netWorthData.accounts);
    setGoals(gls);
  };

  const handleBeforeAdd = (tx) => {
    const person = people.find(p => p.name === tx.category);
    if (person) {
       const entryMonth = tx.date.slice(0, 7);
       const alreadyGiven = transactions
         .filter(t => (t.person || t.category) === person.name && t.date.startsWith(entryMonth))
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

    const { error } = await supabase
      .from('people')
      .delete()
      .eq('name', name)
      .eq('user_id', user.id);

    if (error) {
      alert('Error deleting member: ' + error.message);
      return;
    }
    const updatedPeople = await getPeople();
    setPeople(updatedPeople);
  };

  const handleConfirmOverage = async () => {
    if (pendingTx) {
      await addTransaction({ ...pendingTx, type: 'family_support' });
      const [ppl, allTxs, txs, accs, gls, rate] = await Promise.all([
        getPeople(),
        getTransactions(),
        getTransactions({ type: 'family_support' }),
        getAccounts(),
        getGoals(),
        getSetting('exchange_rate')
      ]);

      const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, gls);

      setPeople(ppl);
      setTransactions(txs);
      setAccounts(netWorthData.accounts);
      setGoals(gls);
      setPendingTx(null);
      setWarning(null);
    }
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    const [allTxs, txs, accs, gls, rate] = await Promise.all([
      getTransactions(),
      getTransactions({ type: 'family_support' }),
      getAccounts(),
      getGoals(),
      getSetting('exchange_rate')
    ]);
    
    const netWorthData = calculateNetWorth(allTxs, accs, rate || 1, null, gls);

    setTransactions(txs);
    setAccounts(netWorthData.accounts);
    setGoals(gls);
  };

  const monthTransactions = transactions.filter(tx => tx.date.startsWith(currentMonth));

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

  if (people.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen-title">Family Support</h1>
        <p className="screen-sub">What you can give this month, by person.</p>
        <div className="empty-state">
          <div className="empty-icon">👨‍‍👧‍👦</div>
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
        <button 
          className={`tab-button ${tab === 'variance' ? 'active' : ''}`} 
          onClick={() => setTab('variance')}
        >
          Variance
        </button>
      </div>

      {tab !== 'budget' && (
        <MonthPicker currentMonth={currentMonth} onChange={setCurrentMonth} />
      )}

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
      ) : tab === 'given' ? (
        <LogTab 
          view="entries"
          allTransactions={transactions}
          filteredTransactions={monthTransactions} 
          currentMonth={currentMonth}
          categories={people.map(p => ({ name: p.name, baseline: p.budget }))} 
          familyTypes={familyTypes} 
          goals={goals}
          accounts={accounts}
          type="family_support" 
          onAdd={handleAdd} 
          onDelete={handleDelete}
          onBeforeAdd={handleBeforeAdd}
        />
      ) : (
        <LogTab 
          view="variance"
          allTransactions={transactions}
          filteredTransactions={monthTransactions} 
          currentMonth={currentMonth}
          categories={people.map(p => ({ name: p.name, baseline: p.budget }))} 
          familyTypes={familyTypes} 
          goals={goals}
          accounts={accounts}
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