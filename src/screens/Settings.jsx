import React, { useState, useEffect } from 'react';
import { getSetting, updateSetting, getTransactions } from '../lib/storage';
import { formatNaira } from '../lib/format';

export default function Settings() {
  const [exchangeRate, setExchangeRate] = useState(1400);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRate, setDraftRate] = useState('');

  useEffect(() => {
    getSetting('exchange_rate').then(val => {
      setExchangeRate(val);
      setDraftRate(String(val));
    });
  }, []);

  const handleUpdateRate = async (e) => {
    e.preventDefault();
    const newRate = Number(draftRate);
    if (newRate > 0) {
      await updateSetting('exchange_rate', newRate);
      setExchangeRate(newRate);
      setIsEditing(false);
    }
  };

  const handleExport = async () => {
    const transactions = await getTransactions();
    if (transactions.length === 0) {
      alert("No transactions to export yet!");
      return;
    }
    
    const headers = ['Date', 'Type', 'Category/Person', 'Amount', 'Currency', 'Note'];
    const rows = transactions.map(tx => [
      tx.date,
      tx.type,
      tx.category || tx.person || tx.source || 'N/A',
      tx.amount,
      tx.currency,
      `"${(tx.note || '').replace(/"/g, '""')}"` // Escape quotes in notes
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anchor-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>
      <p className="screen-sub">Manage your app preferences.</p>
      
      <div className="list-wrap">
        <div className="list-row">
          <div className="list-row-content">
            <div className="list-row-title">Exchange Rate (NGN/USD)</div>
            <div className="list-row-meta">
              {isEditing ? (
                <form onSubmit={handleUpdateRate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={draftRate} 
                    onChange={(e) => setDraftRate(e.target.value)} 
                    className="form-input" 
                    style={{ width: 100, padding: 6 }}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Save</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setIsEditing(false); setDraftRate(String(exchangeRate)); }} style={{ padding: '6px 12px', fontSize: 12 }}>Cancel</button>
                </form>
              ) : (
                `1 USD = ${formatNaira(exchangeRate)}`
              )}
            </div>
          </div>
          {!isEditing && (
            <button className="btn btn-outline" onClick={() => setIsEditing(true)}>Edit</button>
          )}
        </div>

        <div className="list-row">
          <div className="list-row-content">
            <div className="list-row-title">Export Data</div>
            <div className="list-row-meta">Download all transactions as CSV</div>
          </div>
          <button className="btn btn-outline" onClick={handleExport}>Export</button>
        </div>
      </div>
    </div>
  );
}