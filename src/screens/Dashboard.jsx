import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  getTransactions, 
  getGoals, 
  getSetting, 
  updateGoal, 
  addTransaction
} from '../lib/storage';
import { calculateNetWorth, calculateMonthlySummary } from '../lib/calculations';
import { formatNaira } from '../lib/format';
import GoalRow from '../components/GoalRow';
import Modal from '../components/Modal';

// Muted colors that match your dark theme
const COLORS = [
  '#B8935F', 
  '#8FA98A', 
  '#5A7F9F', 
  '#B87C6B', 
  '#9F8FA9', 
  '#7FA9BF', 
  '#D4A373', 
  '#A98FA9'
];

export default function Dashboard() {
  const [data, setData] = useState({
    netWorth: 0,
    availableBalance: 0,
    income: 0,
    expenses: 0,
    goals: [],
    expenseBreakdown: []
  });
  
  const [loading, setLoading] = useState(true);
  
  // Month picker state (defaults to current month)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payingGoal, setPayingGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
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
    const loadData = async () => {
      const [transactions, goals, startingBalance, exchangeRate, usdHoldings] = await Promise.all([
        getTransactions(), 
        getGoals(), 
        getSetting('starting_balance'), 
        getSetting('exchange_rate'), 
        getSetting('usd_holdings'),
      ]);

      // Calculate Previous Month Key
      const prevMonthDate = new Date(currentMonth + '-01');
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);

      // Filter transactions
      const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonth));
      const prevMonthTxs = transactions.filter(tx => tx.date.startsWith(prevMonthKey));
      
      const summary = calculateMonthlySummary(currentMonthTxs, currentMonth);
      const netWorthData = calculateNetWorth(transactions, startingBalance, exchangeRate, usdHoldings || 0);

      // FIX: Calculate Available Balance. 
      // We filter out 'is_paid' goals because that money is already spent (reducing Net Worth),
      // so it shouldn't be subtracted from Available balance again.
      const totalLockedInGoals = goals
        .filter(g => !g.is_paid)
        .reduce((sum, g) => sum + (g.current || 0), 0);
        
      const availableBalance = netWorthData.total - totalLockedInGoals;

      // Calculate Monthly Changes
      // FIX: Only include 'expense' and 'family_support' in the monthly outflow.
      // This ensures 'goal_transfer' doesn't artificially drop your monthly change.
      const currentIncome = currentMonthTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const currentExpense = currentMonthTxs
        .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const currentDelta = currentIncome - currentExpense;

      const prevIncome = prevMonthTxs
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const prevExpense = prevMonthTxs
        .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const prevDelta = prevIncome - prevExpense;

      let percentageChange = 0;
      if (prevDelta !== 0) {
        percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
      }

      // FIX: Pie Chart Data (Now includes both 'expense' and 'family_support')
      const breakdownMap = {};

      currentMonthTxs
        .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
        .forEach(tx => {
          // Use category for expenses, person for family support, fallback to 'Other'
          const cat = tx.category || tx.person || 'Other';
          breakdownMap[cat] = (breakdownMap[cat] || 0) + tx.amount;
        });

      const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
        name,
        value
      }));

      setData({
        netWorth: netWorthData.total,
        availableBalance: availableBalance,
        income: summary.income,
        expenses: summary.totalOutflow,
        goals,
        expenseBreakdown,
        monthlyChange: currentDelta,
        percentageChange: percentageChange,
        trend: [
          { month: 'Apr', value: 420000 }, 
          { month: 'Sep', value: netWorthData.total },
        ],
      });
      
      setLoading(false);
    };
    
    loadData();
  }, [currentMonth]); // Re-run when month changes

  const refreshData = async () => {
    const goals = await getGoals();
    const transactions = await getTransactions();
    
    const [startingBalance, exchangeRate, usdHoldings] = await Promise.all([
      getSetting('starting_balance'), 
      getSetting('exchange_rate'), 
      getSetting('usd_holdings')
    ]);

    const netWorthData = calculateNetWorth(transactions, startingBalance, exchangeRate, usdHoldings || 0);
    
    // FIX: Calculate Available Balance (Ignore paid goals)
    const totalLockedInGoals = goals
      .filter(g => !g.is_paid)
      .reduce((sum, g) => sum + (g.current || 0), 0);
      
    const availableBalance = netWorthData.total - totalLockedInGoals;
    
    const prevMonthDate = new Date(currentMonth + '-01');
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);
    
    const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonth));
    const prevMonthTxs = transactions.filter(tx => tx.date.startsWith(prevMonthKey));
    
    const summary = calculateMonthlySummary(currentMonthTxs, currentMonth);
    
    // FIX: Only include 'expense' and 'family_support' in the monthly outflow.
    const currentIncome = currentMonthTxs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const currentExpense = currentMonthTxs
      .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const currentDelta = currentIncome - currentExpense;

    const prevIncome = prevMonthTxs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const prevExpense = prevMonthTxs
      .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const prevDelta = prevIncome - prevExpense;

    let percentageChange = 0;
    if (prevDelta !== 0) {
      percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
    }

    // FIX: Pie Chart Data (Now includes both 'expense' and 'family_support')
    const breakdownMap = {};

    currentMonthTxs
      .filter(tx => tx.type === 'expense' || tx.type === 'family_support')
      .forEach(tx => {
        // Use category for expenses, person for family support, fallback to 'Other'
        const cat = tx.category || tx.person || 'Other';
        breakdownMap[cat] = (breakdownMap[cat] || 0) + tx.amount;
      });

    const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value
    }));

    setData(prev => ({ 
      ...prev, 
      goals, 
      netWorth: netWorthData.total, 
      availableBalance: availableBalance,
      income: summary.income, 
      expenses: summary.totalOutflow, 
      expenseBreakdown,
      monthlyChange: currentDelta,
      percentageChange: percentageChange
    }));
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0 || !payingGoal) return;
    
    // FIX: Changed type from 'expense' to 'goal_transfer' so it doesn't reduce Net Worth.
    // Added goal_id so deleting the transaction reverses the goal progress.
    await addTransaction({ 
      type: 'goal_transfer', 
      category: 'Goal Payment', 
      amount, 
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
    await refreshData();
    
    setPayingGoal(null);
    setPayForm({ 
      amount: '', 
      date: new Date().toISOString().slice(0, 10), 
      note: '' 
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    await updateGoal(editingGoal.id, { 
      name: editForm.name, 
      target: Number(editForm.target), 
      deadline: editForm.deadline || null 
    });
    
    await refreshData();
    setEditingGoal(null);
  };

  // Month picker helpers
  const handlePrevMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const monthName = new Date(currentMonth + '-01').toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  // FIX: Filter and sort active goals by urgency for the Dashboard
  const activeGoals = data.goals.filter(g => g.current < g.target);
  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (loading) return <div className="loading">Loading your finances...</div>;

  return (
    <div className="screen">
      {/* Month Picker */}
      <div className="month-selector">
        <button className="btn-icon" onClick={handlePrevMonth}>←</button>
        <span className="month-label">{monthName}</span>
        <button className="btn-icon" onClick={handleNextMonth}>→</button>
      </div>

      <header className="page-header">
        <p className="eyebrow">Where things stand</p>
        <h1 className="hero-number">{formatNaira(data.netWorth)}</h1>
        
        {/* FIX: Added Available Balance line */}
        <p className="hero-sub" style={{ color: 'var(--accent-gold)', marginTop: 8 }}>
          Available to spend: {formatNaira(data.availableBalance)}
        </p>
        
        {/* Only show the change if there is actual activity this month */}
        {(data.income > 0 || data.expenses > 0) && (
          <div className="networth-change">
            <span className={`change-value ${data.monthlyChange >= 0 ? 'positive' : 'negative'}`}>
              {data.monthlyChange >= 0 ? '▲' : '▼'} {formatNaira(Math.abs(data.monthlyChange))}
            </span>
            <span className="change-percent">
              ({data.percentageChange.toFixed(1)}% vs last month)
            </span>
          </div>
        )}
        
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

      {/* Pie Chart Section (Filtered by selected month) */}
      {data.expenses > 0 && (
        <section className="section">
          <h2 className="section-title">Where your money went</h2>
          
          <div className="chart-wrap" style={{ padding: '16px 0' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={90} 
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.expenseBreakdown.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#16283C', 
                    border: '1px solid #2A3B4D', 
                    borderRadius: 6, 
                    color: '#EDE9E1' 
                  }}
                  formatter={(value, name) => [formatNaira(value), name]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="pie-legend">
              {data.expenseBreakdown.map((entry, index) => {
                const percentage = Math.round((entry.value / data.expenses) * 100);
                
                return (
                  <div key={entry.name} className="legend-item">
                    <span 
                      className="legend-dot" 
                      style={{ background: COLORS[index % COLORS.length] }} 
                    />
                    <span className="legend-text">{entry.name}</span>
                    <span className="legend-value">
                      {formatNaira(entry.value)} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Goals in motion</h2>
        <div className="goals-wrap">
          {/* FIX: Map over sortedActiveGoals and removed onDelete prop */}
          {sortedActiveGoals.map((g) => (
            <GoalRow 
              key={g.id} 
              goal={g} 
              onEdit={setEditingGoal} 
              onPay={(goal) => {
                const remaining = goal.target - goal.current;
                setPayForm({ 
                  amount: String(remaining > 0 ? remaining : goal.target), 
                  date: new Date().toISOString().slice(0, 10), 
                  note: '' 
                });
                setPayingGoal(goal);
              }} 
            />
          ))}
          
          {/* Show a hint if all goals are completed or none exist */}
          {sortedActiveGoals.length === 0 && (
            <p className="hint-text">No active goals right now. Check the Goals tab to add one!</p>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Net worth trend</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.trend}>
              <XAxis 
                dataKey="month" 
                stroke="#5A6B7A" 
                tick={{ fill: '#8A98A5', fontSize: 12 }} 
                axisLine={{ stroke: '#2A3B4D' }} 
                tickLine={false} 
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  background: '#16283C', 
                  border: '1px solid #2A3B4D', 
                  borderRadius: 4, 
                  color: '#EDE9E1' 
                }} 
                formatter={(value) => [formatNaira(value), 'Net worth']} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#B8935F" 
                strokeWidth={2} 
                dot={{ fill: '#B8935F', r: 3 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Modals */}
      <Modal isOpen={!!payingGoal} onClose={() => setPayingGoal(null)} title={`Pay towards ${payingGoal?.name}`}>
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">
            Amount 
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
            Note 
            <input 
              type="text" 
              value={payForm.note} 
              onChange={e => setPayForm({...payForm, note: e.target.value})} 
              className="form-input" 
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
              Confirm
            </button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
}