import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';

import {
  getTransactions, getGoals, getSetting, updateGoal, addTransaction
} from '../lib/storage';

import {
  calculateNetWorth, calculateMonthlySummary
} from '../lib/calculations';

import { formatNaira } from '../lib/format';
import GoalRow from '../components/GoalRow';
import Modal from '../components/Modal';
import ImpulseInsight from '../components/ImpulseInsight';

const COLORS = [
  '#B8935F', '#8FA98A', '#5A7F9F', '#B87C6B',
  '#9F8FA9', '#7FA9BF', '#D4A373', '#A98FA9'
];

export default function Dashboard() {
  const [data, setData] = useState({
    netWorth: 0,
    availableBalance: 0,
    income: 0,
    expenses: 0,
    impulseTotal: 0,
    impulsePercentage: 0,
    impulseBudget: 0,
    goals: [],
    expenseBreakdown: [],
    monthlyChange: 0,
    percentageChange: 0,
    trend: []
  });

  const [loading, setLoading] = useState(true);

  // Month picker state
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const [payingGoal, setPayingGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [insightTab, setInsightTab] = useState('breakdown');

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

  // ─────────────────────────────────────────────
  // LOAD DASHBOARD DATA
  // ─────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      const [transactions, goals, startingBalance, exchangeRate, usdHoldings, impulseBudget] = await Promise.all([
        getTransactions(),
        getGoals(),
        getSetting('starting_balance'),
        getSetting('exchange_rate'),
        getSetting('usd_holdings'),
        getSetting('impulse_budget')
      ]);

      // Calculate previous month
      const prevMonthDate = new Date(`${currentMonth}-01`);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);

      // Filter transactions
      const currentMonthTxs = transactions.filter((tx) => tx.date.startsWith(currentMonth));
      const prevMonthTxs = transactions.filter((tx) => tx.date.startsWith(prevMonthKey));

      // Monthly summaries
      const summary = calculateMonthlySummary(currentMonthTxs, currentMonth, exchangeRate);
      const prevSummary = calculateMonthlySummary(prevMonthTxs, prevMonthKey, exchangeRate);

      // Net worth
      const netWorthData = calculateNetWorth(
        transactions,
        startingBalance,
        exchangeRate,
        usdHoldings || 0
      );

      // ─────────────────────────────────────────
      // AVAILABLE BALANCE
      // ─────────────────────────────────────────

      const totalLockedInGoals = goals
        .filter((goal) => !goal.is_paid)
        .reduce((sum, goal) => sum + (goal.current || 0), 0);

      const availableBalance = netWorthData.total - totalLockedInGoals;

      // ─────────────────────────────────────────
      // MONTHLY CHANGE
      // ─────────────────────────────────────────

      const currentDelta = summary.income - summary.totalOutflow;
      const prevDelta = prevSummary.income - prevSummary.totalOutflow;

      let percentageChange = 0;

      if (prevDelta !== 0) {
        percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
      }

      // ─────────────────────────────────────────
      // EXPENSE BREAKDOWN
      // ─────────────────────────────────────────

      const breakdownMap = {};

      currentMonthTxs
        .filter((tx) => tx.type === 'expense' || tx.type === 'family_support')
        .forEach((tx) => {
          const category = tx.category || tx.person || 'Other';
          // Convert to NGN if it's a USD transaction, same as the monthly summary
          const amount = tx.currency === 'USD' ? tx.amount * exchangeRate : tx.amount;
          breakdownMap[category] = (breakdownMap[category] || 0) + amount;
        });

      const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
        name,
        value
      }));

      // ─────────────────────────────────────────
      // SET DASHBOARD DATA
      // ─────────────────────────────────────────

      setData({
        netWorth: netWorthData.total,
        availableBalance,
        income: summary.income,
        expenses: summary.totalOutflow,
        expensesOnly: summary.expenses,
        impulseTotal: summary.impulseTotal,
        impulsePercentage: summary.impulsePercentage,
        impulseBudget,
        goals,
        expenseBreakdown,
        monthlyChange: currentDelta,
        percentageChange,
        trend: [
          { month: 'Apr', value: 420000 },
          { month: 'Sep', value: netWorthData.total }
        ]
      });

      setLoading(false);
    };

    loadData();
  }, [currentMonth]);

  // ─────────────────────────────────────────────
  // REFRESH DATA
  // ─────────────────────────────────────────────

  const refreshData = async () => {
    const goals = await getGoals();
    const transactions = await getTransactions();

    const [startingBalance, exchangeRate, usdHoldings, impulseBudget] = await Promise.all([
      getSetting('starting_balance'),
      getSetting('exchange_rate'),
      getSetting('usd_holdings'),
      getSetting('impulse_budget')
    ]);

    const netWorthData = calculateNetWorth(
      transactions,
      startingBalance,
      exchangeRate,
      usdHoldings || 0
    );

    // Available balance
    const totalLockedInGoals = goals
      .filter((goal) => !goal.is_paid)
      .reduce((sum, goal) => sum + (goal.current || 0), 0);

    const availableBalance = netWorthData.total - totalLockedInGoals;

    // Previous month
    const prevMonthDate = new Date(`${currentMonth}-01`);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);

    // Filter transactions
    const currentMonthTxs = transactions.filter((tx) => tx.date.startsWith(currentMonth));
    const prevMonthTxs = transactions.filter((tx) => tx.date.startsWith(prevMonthKey));

    // Monthly summaries
    const summary = calculateMonthlySummary(currentMonthTxs, currentMonth, exchangeRate);
    const prevSummary = calculateMonthlySummary(prevMonthTxs, prevMonthKey, exchangeRate);

    // Monthly change
    const currentDelta = summary.income - summary.totalOutflow;
    const prevDelta = prevSummary.income - prevSummary.totalOutflow;

    let percentageChange = 0;

    if (prevDelta !== 0) {
      percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
    }

    // Expense breakdown
    const breakdownMap = {};

    currentMonthTxs
      .filter((tx) => tx.type === 'expense' || tx.type === 'family_support')
      .forEach((tx) => {
        const category = tx.category || tx.person || 'Other';
        // Convert to NGN if it's a USD transaction, same as the monthly summary
        const amount = tx.currency === 'USD' ? tx.amount * exchangeRate : tx.amount;
        breakdownMap[category] = (breakdownMap[category] || 0) + amount;
      });

    const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
      name,
      value
    }));

    // Update state
    setData((prev) => ({
      ...prev,
      goals,
      netWorth: netWorthData.total,
      availableBalance,
      income: summary.income,
      expenses: summary.totalOutflow,
      expensesOnly: summary.expenses,
      impulseTotal: summary.impulseTotal,
      impulsePercentage: summary.impulsePercentage,
      impulseBudget,
      expenseBreakdown,
      monthlyChange: currentDelta,
      percentageChange
    }));
  };

  // ─────────────────────────────────────────────
  // PAY GOAL
  // ─────────────────────────────────────────────

  const handlePaySubmit = async (e) => {
    e.preventDefault();

    const amount = Number(payForm.amount);

    if (!amount || amount <= 0 || !payingGoal) return;

    // Goal transfers are not treated as expenses.
    await addTransaction({
      type: 'goal_transfer',
      category: 'Goal Payment',
      amount,
      date: payForm.date,
      note: payForm.note || `Paid for ${payingGoal.name}`,
      impulse: false,
      goal_id: payingGoal.id
    });

    // Cap goal progress at the target.
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

  // ─────────────────────────────────────────────
  // EDIT GOAL
  // ─────────────────────────────────────────────

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

  // ─────────────────────────────────────────────
  // MONTH PICKER
  // ─────────────────────────────────────────────

  const handlePrevMonth = () => {
    const date = new Date(`${currentMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const date = new Date(`${currentMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const monthName = new Date(`${currentMonth}-01`).toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  // ─────────────────────────────────────────────
  // ACTIVE GOALS
  // ─────────────────────────────────────────────

  const activeGoals = data.goals.filter((goal) => goal.current < goal.target);

  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return <div className="loading">Loading your finances...</div>;
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="screen">
      {/* Month Picker */}
      <div className="month-selector">
        <button className="btn-icon" onClick={handlePrevMonth}>←</button>
        <span className="month-label">{monthName}</span>
        <button className="btn-icon" onClick={handleNextMonth}>→</button>
      </div>

      {/* Header */}
      <header className="page-header">
        <p className="eyebrow">Where things stand</p>

        <h1 className="hero-number">{formatNaira(data.netWorth)}</h1>

        <p className="hero-sub" style={{ color: 'var(--accent-gold)', marginTop: 8 }}>
          Available to spend: {formatNaira(data.availableBalance)}
        </p>

        {/* Only show change when there is activity */}
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

      {/* Monthly Summary */}
      <section className="grid-two">
        <div className="summary-block">
          <p className="summary-label">Income this month</p>
          <p className="summary-value">{formatNaira(data.income)}</p>
        </div>

        <div className="summary-block">
          <p className="summary-label">Outflow this month</p>
          <p className="summary-value">{formatNaira(data.expenses)}</p>
          <p className="hint-text" style={{ marginTop: 5 }}>
            Expenses: {formatNaira(data.expensesOnly)}
          </p>
        </div>
      </section>

      {/* Spending Insights */}
      {data.expenses > 0 && (
        <section className="section">
          <h2 className="section-title">Spending Insights</h2>

          <div
            className="insight-tabs"
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              marginBottom: 16,
              paddingBottom: 2
            }}
          >
            <button
              type="button"
              className={`btn ${insightTab === 'breakdown' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setInsightTab('breakdown')}
              style={{ whiteSpace: 'nowrap' }}
            >
              Where My Money Went
            </button>

            <button
              type="button"
              className={`btn ${insightTab === 'impulse' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setInsightTab('impulse')}
              style={{ whiteSpace: 'nowrap' }}
            >
              Impulse
            </button>
          </div>

          {insightTab === 'breakdown' && (
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
          )}

          {insightTab === 'impulse' && (
            <ImpulseInsight
              impulseTotal={data.impulseTotal}
              impulsePercentage={data.impulsePercentage}
              impulseBudget={data.impulseBudget}
            />
          )}
        </section>
      )}

      {/* Goals */}
      <section className="section">
        <h2 className="section-title">Goals in motion</h2>

        <div className="goals-wrap">
          {sortedActiveGoals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onEdit={setEditingGoal}
              onPay={(selectedGoal) => {
                const remaining = selectedGoal.target - selectedGoal.current;

                setPayForm({
                  amount: String(remaining > 0 ? remaining : selectedGoal.target),
                  date: new Date().toISOString().slice(0, 10),
                  note: ''
                });

                setPayingGoal(selectedGoal);
              }}
            />
          ))}

          {sortedActiveGoals.length === 0 && (
            <p className="hint-text">
              No active goals right now. Check the Goals tab to add one!
            </p>
          )}
        </div>
      </section>

      {/* Net Worth Trend */}
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

      {/* Pay Goal Modal */}
      <Modal
        isOpen={!!payingGoal}
        onClose={() => setPayingGoal(null)}
        title={`Pay towards ${payingGoal?.name}`}
      >
        <form
          onSubmit={handlePaySubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <label className="form-label">
            Amount
            <input
              type="number"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              className="form-input"
              required
            />
          </label>

          <label className="form-label">
            Date
            <input
              type="date"
              value={payForm.date}
              onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
              className="form-input"
              required
            />
          </label>

          <label className="form-label">
            Note
            <input
              type="text"
              value={payForm.note}
              onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
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

      {/* Edit Goal Modal */}
      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Edit Goal"
      >
        <form
          onSubmit={handleEditSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <label className="form-label">
            Name
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="form-input"
              required
            />
          </label>

          <label className="form-label">
            Target
            <input
              type="number"
              value={editForm.target}
              onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
              className="form-input"
              required
            />
          </label>

          <label className="form-label">
            Deadline
            <input
              type="date"
              value={editForm.deadline}
              onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
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