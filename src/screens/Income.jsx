import React, { useState, useEffect } from 'react';
import { 
  getTransactions, 
  addTransaction, 
  deleteTransaction, 
  getIncomeSources, 
  addIncomeSource,
  deleteIncomeSource,
  getSetting 
} from '../lib/storage';
import { formatNaira } from '../lib/format';
import TransactionRow from '../components/TransactionRow';

export default function Income() {
  const [transactions, setTransactions] = useState([]);
  const [sources, setSources] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(1);
  
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'ngn', 'usd'
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ 
    source: '', 
    currency: 'NGN', 
    amount: '', 
    date: new Date().toISOString().slice(0, 10), 
    note: '' 
  });

  useEffect(() => { 
    const loadData = async () => {
      const [txs, srcs, rate] = await Promise.all([
        getTransactions({ type: 'income' }), 
        getIncomeSources(),
        getSetting('exchange_rate')
      ]);
      setTransactions(txs);
      setSources(srcs);
      setExchangeRate(rate || 1);
      
      // Set default source if available
      if (srcs.length > 0 && !formData.source) {
        setFormData(prev => ({ ...prev, source: srcs[0].name, currency: srcs[0].default_currency }));
      }
    };
    loadData();
  }, []);

  const handleAddSource = async () => {
    const name = prompt('Enter new income source name (e.g., Freelance, Salary):');
    if (!name || name.trim() === '') return;
    
    const currency = prompt('Default currency for this source? (Enter NGN or USD):', 'NGN');
    const validCurrency = currency?.toUpperCase() === 'USD' ? 'USD' : 'NGN';
    
    await addIncomeSource(name.trim(), validCurrency);
    const updatedSources = await getIncomeSources();
    setSources(updatedSources);
  };

  const handleDeleteSource = async () => {
    // PROTECTION: Prevent deletion of the Starting Balance source
    if (formData.source === 'Starting Balance') {
      alert('You cannot delete the "Starting Balance" source.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the "${formData.source}" source?`)) return;
    
    const sourceToDelete = sources.find(s => s.name === formData.source);
    if (sourceToDelete) {
      await deleteIncomeSource(sourceToDelete.id);
      const updatedSources = await getIncomeSources();
      setSources(updatedSources);
      
      // Reset form to the first available source if the deleted one was selected
      if (updatedSources.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          source: updatedSources[0].name, 
          currency: updatedSources[0].default_currency 
        }));
      } else {
        setFormData(prev => ({ ...prev, source: '', currency: 'NGN' }));
      }
    }
  };

  const handleSourceChange = (e) => {
    const selectedSource = sources.find(s => s.name === e.target.value);
    setFormData(prev => ({ 
      ...prev, 
      source: e.target.value, 
      currency: selectedSource ? selectedSource.default_currency : prev.currency 
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const parsed = Number(formData.amount);
    if (!parsed || parsed <= 0) return;

    await addTransaction({ 
      ...formData, 
      amount: parsed, 
      type: 'income' 
    });
    
    const newTxs = await getTransactions({ type: 'income' });
    setTransactions(newTxs);
    setShowForm(false);
    setFormData(prev => ({ ...prev, amount: '', note: '' }));
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Filter transactions based on active tab
  const displayTransactions = transactions.filter(tx => {
    if (activeTab === 'all') return true;
    return tx.currency === activeTab.toUpperCase();
  });

  const convertedAmount = formData.currency === 'USD' && formData.amount 
    ? (Number(formData.amount) * exchangeRate).toLocaleString('en-NG', { maximumFractionDigits: 0 })
    : null;

  return (
    <div className="screen">
      <h1 className="screen-title">Income</h1>
      <p className="screen-sub">Every source, tracked in one place.</p>
      
      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom: 24 }}>
        {['all', 'ngn', 'usd'].map(tab => (
          <button 
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="list-wrap">
        {displayTransactions.length === 0 && (
          <p className="hint-text">No income logged for this filter.</p>
        )}
        {displayTransactions.map(tx => (
          <TransactionRow key={tx.id} transaction={tx} onDelete={handleDelete} />
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="btn btn-outline" style={{ marginTop: 20 }}>
        {showForm ? 'Cancel' : '+ Add Income'}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="form-card">
          <label className="form-label">Source
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select 
                value={formData.source} 
                onChange={handleSourceChange} 
                className="form-select" 
                required
                style={{ flex: 1 }}
              >
                {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              
              {/* Add Source Button */}
              <button 
                type="button" 
                onClick={handleAddSource} 
                className="btn btn-ghost" 
                style={{ padding: '0 12px', fontSize: 18 }}
                title="Add new source"
              >
                +
              </button>

              {/* Delete Source Button (Hidden if "Starting Balance" is selected) */}
              {formData.source !== 'Starting Balance' && sources.length > 0 && (
                <button 
                  type="button" 
                  onClick={handleDeleteSource} 
                  className="btn btn-ghost" 
                  style={{ padding: '0 12px', color: 'var(--text-danger, #d9534f)' }}
                  title="Delete this source"
                >
                  
                </button>
              )}
            </div>
          </label>

          <label className="form-label">Currency
            <select 
              value={formData.currency} 
              onChange={e => setFormData({...formData, currency: e.target.value})} 
              className="form-select" 
              required
            >
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </label>

          <label className="form-label">Amount
            <input 
              type="number" 
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: e.target.value})} 
              className="form-input" 
              required 
            />
            {convertedAmount && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                ≈ ₦{convertedAmount}
              </span>
            )}
          </label>

          <label className="form-label">Date
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="form-input" required />
          </label>
          
          <label className="form-label">Note (Optional)
            <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="form-input" placeholder="e.g. Client payment" />
          </label>
          
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Income</button>
          </div>
        </form>
      )}
    </div>
  );
}