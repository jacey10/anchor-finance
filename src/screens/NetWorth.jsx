import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getAccounts, getSetting, addAccount, deleteAccount, getGoals, addTransaction, deleteTransaction } from '../lib/storage';
import { calculateNetWorth } from '../lib/calculations';
import { formatNaira, formatUSD } from '../lib/format';
import Modal from '../components/Modal';
import TransactionRow from '../components/TransactionRow';

export default function NetWorth() {
  const [data, setData] = useState({ total: 0, ngn: 0, usd: 0, accounts: [] });
  const [exchangeRate, setExchangeRate] = useState(1);
  const [activeTab, setActiveTab] = useState('summary');
  const [transfers, setTransfers] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ name: '', currency: 'NGN', starting_balance: '', starting_balance_date: new Date().toISOString().slice(0, 10) });
  const [formError, setFormError] = useState('');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ from_account_id: '', to_account_id: '', amount: '', fee: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [transferError, setTransferError] = useState('');

  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState({ account_id: '', amount: '', date: new Date().toISOString().slice(0, 10), note: '' });
  const [feeError, setFeeError] = useState('');

  const fetchData = async () => {
    try {
      const [txs, accountsData, rate, transferTxs, feeTxs, goalTransferTxs, fetchedGoals] = await Promise.all([
        getTransactions(), getAccounts(), getSetting('exchange_rate'),
        getTransactions({ type: 'transfer' }), getTransactions({ type: 'bank_fee' }), getTransactions({ type: 'goal_transfer' }), getGoals()
      ]);
      
      const safeAccounts = accountsData || [];
      const safeRate = rate || 1;
      const calculated = calculateNetWorth(txs, safeAccounts, safeRate, null, fetchedGoals);
      setData(calculated);
      setExchangeRate(safeRate);

      // V2 FIX: Enrich goal transfers with names for the UI
      const enrichedGoalTransfers = goalTransferTxs.map(tx => {
        const acc = accountsData.find(a => a.id === tx.account_id);
        const goal = fetchedGoals.find(g => g.id === tx.goal_id);
        return { ...tx, displayTitle: `${acc ? acc.name : 'Unknown Account'} → ${goal ? goal.name : 'Unknown Goal'}` };
      });

      const combined = [...transferTxs, ...feeTxs, ...enrichedGoalTransfers].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransfers(combined);
    } catch (error) {
      console.error("Net Worth fetch failed:", error);
      setData({ total: 0, ngn: 0, usd: 0, accounts: [] });
      setTransfers([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenAddModal = () => {
    setFormError('');
    setNewAccountForm({ name: '', currency: activeTab === 'usd' ? 'USD' : 'NGN', starting_balance: '', starting_balance_date: new Date().toISOString().slice(0, 10) });
    setShowAddModal(true);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setFormError('');
    const name = newAccountForm.name.trim();
    const balance = Number(newAccountForm.starting_balance);
    const date = newAccountForm.starting_balance_date;

    if (!name) { setFormError('Account name is required.'); return; }
    if (balance < 0) { setFormError('Starting balance cannot be negative.'); return; }
    if (data.accounts.some(acc => acc.name.toLowerCase() === name.toLowerCase())) { setFormError('An account with this name already exists.'); return; }

    try {
      await addAccount({ name, currency: newAccountForm.currency, starting_balance: balance, starting_balance_date: date });
      setShowAddModal(false);
      await fetchData(); 
    } catch (err) {
      console.error("Failed to add account:", err);
      setFormError('Failed to add account. Please try again.');
    }
  };

  const handleDeleteAccount = async (accountId, accountName) => {
    if (!window.confirm(`Are you sure you want to delete "${accountName}"? This will not delete historical transactions, but they will no longer be linked to this account.`)) return;
    try { await deleteAccount(accountId); await fetchData(); } 
    catch (err) { console.error("Failed to delete account:", err); alert('Failed to delete account. Please try again.'); }
  };

  const handleOpenTransferModal = () => {
    setTransferError('');
    setTransferForm({ from_account_id: '', to_account_id: '', amount: '', fee: '', date: new Date().toISOString().slice(0, 10), note: '' });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError('');
    const amount = Number(transferForm.amount);
    const fee = Number(transferForm.fee) || 0;

    if (!transferForm.from_account_id) { setTransferError('Please select a source account.'); return; }
    if (!transferForm.to_account_id) { setTransferError('Please select a destination account.'); return; }
    if (transferForm.from_account_id === transferForm.to_account_id) { setTransferError('Source and destination accounts cannot be the same.'); return; }
    if (!amount || amount <= 0) { setTransferError('Amount must be greater than zero.'); return; }

    const fromAcc = data.accounts.find(a => a.id === transferForm.from_account_id);
    const toAcc = data.accounts.find(a => a.id === transferForm.to_account_id);
    const transferNote = transferForm.note ? `${transferForm.note} (${fromAcc.name} → ${toAcc.name})` : `${fromAcc.name} → ${toAcc.name}`;

    try {
      await addTransaction({
        type: 'transfer', category: 'Transfer', account_id: transferForm.from_account_id,
        transfer_to_account_id: transferForm.to_account_id, amount, fee, date: transferForm.date,
        note: transferNote, currency: fromAcc.currency
      });
      setShowTransferModal(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to transfer:", err);
      setTransferError('Failed to transfer. Please try again.');
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    setFeeError('');
    const amount = Number(feeForm.amount);
    if (!feeForm.account_id) { setFeeError('Please select an account.'); return; }
    if (!amount || amount <= 0) { setFeeError('Amount must be greater than zero.'); return; }
    const acc = data.accounts.find(a => a.id === feeForm.account_id);

    try {
      await addTransaction({ type: 'bank_fee', category: 'Bank Fee', account_id: feeForm.account_id, amount, date: feeForm.date, note: feeForm.note || 'Standalone bank charge', currency: acc.currency });
      setShowFeeModal(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to log fee:", err);
      setFeeError('Failed to log fee. Please try again.');
    }
  };

  const handleDeleteTransfer = async (id) => {
    await deleteTransaction(id);
    setTransfers(transfers.filter(t => t.id !== id));
  };

  const availableToAccounts = data.accounts.filter(acc => acc.id !== transferForm.from_account_id);
  const fromAccount = data.accounts.find(a => a.id === transferForm.from_account_id);
  const toAccount = data.accounts.find(a => a.id === transferForm.to_account_id);
  const isCrossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;
  const convertedAmount = isCrossCurrency && transferForm.amount ? (fromAccount.currency === 'NGN' ? Number(transferForm.amount) / exchangeRate : Number(transferForm.amount) * exchangeRate) : null;
  const filteredAccounts = data.accounts?.filter(acc => activeTab === 'ngn' ? acc.currency === 'NGN' : acc.currency === 'USD') || [];

  return (
    <div className="screen">
      <h1 className="screen-title">Net Worth</h1>
      <p className="screen-sub">Your total wealth across all assets.</p>
      <div className="tab-row">
        {['summary', 'ngn', 'usd', 'transfers'].map(tab => (
          <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'ngn' ? 'NGN' : tab === 'usd' ? 'USD' : tab === 'transfers' ? 'Transfers & Fees' : 'Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <>
          <div className="networth-cards">
            <div className="networth-card main"><div className="networth-label">Total Net Worth</div><div className="networth-value">{formatNaira(data.total)}</div></div>
            <div className="networth-card"><div className="networth-label">Naira Holdings</div><div className="networth-value">{formatNaira(data.ngn)}</div></div>
            <div className="networth-card"><div className="networth-label">USD Holdings</div>
              <div className="networth-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <span>{formatUSD(data.usd)}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 'normal' }}>≈ {formatNaira(data.usd * exchangeRate)}</span>
              </div>
            </div>
          </div>
          <div className="chart-wrap" style={{ marginTop: 32 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[{ month: 'Current', value: data.total }]}>
                <XAxis dataKey="month" stroke="#5A6B7A" tick={{ fill: '#8A98A5' }} axisLine={{ stroke: '#2A3B4D' }} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#16283C', border: '1px solid #2A3B4D', color: '#EDE9E1' }} formatter={(value) => [formatNaira(value), 'Net worth']} />
                <Line type="monotone" dataKey="value" stroke="#B8935F" strokeWidth={2} dot={{ fill: '#B8935F', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {(activeTab === 'ngn' || activeTab === 'usd') && (
        <>
          <div className="list-wrap">
            {filteredAccounts.length === 0 ? <p className="hint-text">No {activeTab.toUpperCase()} accounts yet.</p> : filteredAccounts.map(acc => (
              <div key={acc.id} className="list-row">
                <div className="list-row-content">
                  <div className="list-row-title">{acc.name}</div>
                  <div className="list-row-meta">Starting: {acc.currency === 'NGN' ? formatNaira(acc.starting_balance || 0) : formatUSD(acc.starting_balance || 0)}</div>
                </div>
                <div className="list-row-actions">
                  <div className="list-row-amount">{acc.currency === 'NGN' ? formatNaira(acc.balance) : formatUSD(acc.balance)}</div>
                  <button className="delete-item-btn" onClick={() => handleDeleteAccount(acc.id, acc.name)} title="Delete account">×</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={handleOpenAddModal}>+ Add {activeTab === 'ngn' ? 'NGN' : 'USD'} Account</button>
          <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleOpenTransferModal}>↗ Transfer Between Accounts</button>
        </>
      )}

      {activeTab === 'transfers' && (
        <>
          <div className="list-wrap">
            {transfers.length === 0 ? <p className="hint-text">No transfers or bank fees logged yet.</p> : transfers.map(tx => (
              <TransactionRow key={tx.id} transaction={tx} onDelete={handleDeleteTransfer} />
            ))}
          </div>
          <button className="btn btn-outline" style={{ marginTop: 20, width: '100%' }} onClick={() => setShowFeeModal(true)}>↗ Log Bank Fee</button>
          <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleOpenTransferModal}>+ New Transfer</button>
        </>
      )}

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Account">
        <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && <div style={{ color: 'var(--accent-red)', fontSize: 13, background: 'var(--bg-warning)', padding: 10, borderRadius: 4 }}>{formError}</div>}
          <label className="form-label">Account Name<input type="text" value={newAccountForm.name} onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })} className="form-input" placeholder="e.g., Zenith Bank, Opay" required /></label>
          <label className="form-label">Currency<select value={newAccountForm.currency} onChange={(e) => setNewAccountForm({ ...newAccountForm, currency: e.target.value })} className="form-select"><option value="NGN">NGN (₦)</option><option value="USD">USD ($)</option></select></label>
          <label className="form-label">Account Opened Date<input type="date" value={newAccountForm.starting_balance_date} onChange={(e) => setNewAccountForm({ ...newAccountForm, starting_balance_date: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Starting Balance<input type="number" value={newAccountForm.starting_balance} onChange={(e) => setNewAccountForm({ ...newAccountForm, starting_balance: e.target.value })} className="form-input" placeholder="0.00" min="0" step="0.01" /></label>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Account</button></div>
        </form>
      </Modal>

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Between Accounts">
        <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {transferError && <div style={{ color: 'var(--accent-red)', fontSize: 13, background: 'var(--bg-warning)', padding: 10, borderRadius: 4 }}>{transferError}</div>}
          <label className="form-label">From Account<select value={transferForm.from_account_id} onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value, to_account_id: '' })} className="form-select" required><option value="">Select source account</option>{data.accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency === 'NGN' ? formatNaira(acc.balance) : formatUSD(acc.balance)})</option>))}</select></label>
          <label className="form-label">To Account<select value={transferForm.to_account_id} onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })} className="form-select" required><option value="">Select destination account</option>{availableToAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency === 'NGN' ? formatNaira(acc.balance) : formatUSD(acc.balance)})</option>))}</select></label>
          <label className="form-label">Amount ({fromAccount?.currency || 'NGN'})<input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} className="form-input" placeholder="0.00" min="0" step="0.01" required />{isCrossCurrency && convertedAmount && (<span style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4, display: 'block' }}>≈ {toAccount?.currency === 'USD' ? formatUSD(convertedAmount) : formatNaira(convertedAmount)} will be added to {toAccount?.name}</span>)}</label>
          <label className="form-label">Transfer Fee (Optional)<input type="number" value={transferForm.fee} onChange={(e) => setTransferForm({ ...transferForm, fee: e.target.value })} className="form-input" placeholder="0.00" min="0" step="0.01" /></label>
          <label className="form-label">Date<input type="date" value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Note (Optional)<input type="text" value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} className="form-input" placeholder="e.g., Moving savings" /></label>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowTransferModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Transfer</button></div>
        </form>
      </Modal>

      <Modal isOpen={showFeeModal} onClose={() => setShowFeeModal(false)} title="Log Bank Fee">
        <form onSubmit={handleFeeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {feeError && <div style={{ color: 'var(--accent-red)', fontSize: 13, background: 'var(--bg-warning)', padding: 10, borderRadius: 4 }}>{feeError}</div>}
          <label className="form-label">Account<select value={feeForm.account_id} onChange={(e) => setFeeForm({ ...feeForm, account_id: e.target.value })} className="form-select" required><option value="">Select account</option>{data.accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency === 'NGN' ? formatNaira(acc.balance) : formatUSD(acc.balance)})</option>))}</select></label>
          <label className="form-label">Fee Amount<input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} className="form-input" placeholder="0.00" min="0" step="0.01" required /></label>
          <label className="form-label">Date<input type="date" value={feeForm.date} onChange={(e) => setFeeForm({ ...feeForm, date: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Note (Optional)<input type="text" value={feeForm.note} onChange={(e) => setFeeForm({ ...feeForm, note: e.target.value })} className="form-input" placeholder="e.g., Monthly SMS alert fee" /></label>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setShowFeeModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Log Fee</button></div>
        </form>
      </Modal>
    </div>
  );
}