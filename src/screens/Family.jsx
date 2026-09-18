import React, { useState, useEffect } from 'react';
import { getPeople, getTransactions, addTransaction, deleteTransaction } from '../lib/storage';
import BaselineTab from '../components/BaselineTab';
import LogTab from '../components/LogTab';
import OverageWarning from '../components/OverageWarning';

export default function Family() {
  const [tab, setTab] = useState('budget');
  const [people, setPeople] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [warning, setWarning] = useState(null);
  const [pendingTx, setPendingTx] = useState(null); // Stores the transaction while warning is open

  useEffect(() => {
    const loadData = async () => {
      const [ppl, txs] = await Promise.all([getPeople(), getTransactions({ type: 'family_support' })]);
      setPeople(ppl);
      setTransactions(txs);
    };
    loadData();
  }, []);

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
        setPendingTx(tx); // Save it temporarily
        setWarning({ 
          person: person.name, 
          cap: person.budget, 
          alreadyGiven, 
          parsed: tx.amount, 
          over: (alreadyGiven + tx.amount) - person.budget 
        });
        return false; // Stop the add, show warning
      }
    }
    return true;
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

  return (
    <div className="screen">
      <h1 className="screen-title">Family Support</h1>
      <p className="screen-sub">What you can give this month, by person.</p>

      <div className="tab-row">
        <button className={`tab-button ${tab === 'budget' ? 'active' : ''}`} onClick={() => setTab('budget')}>Budget</button>
        <button className={`tab-button ${tab === 'given' ? 'active' : ''}`} onClick={() => setTab('given')}>Given</button>
      </div>

      {tab === 'budget' ? (
        <BaselineTab 
          items={people.map(p => ({ key: p.name, name: p.name, value: p.budget || 0 }))} 
          onUpdate={(name, val) => {}} 
          total={people.reduce((sum, p) => sum + (p.budget || 0), 0)} 
          totalLabel="Total family support budget" 
        />
      ) : (
        <LogTab 
          transactions={transactions} 
          categories={people.map(p => ({ name: p.name, baseline: p.budget }))} 
          type="family_support" 
          onAdd={handleAdd} 
          onDelete={handleDelete} // Fixed: passes the wrapper function
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