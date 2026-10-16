import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine,
  PieChart, Pie, Cell, Label
} from 'recharts';
import {
  getTransactions, getGoals, getSetting, updateGoal, addTransaction, getAccounts
} from '../lib/storage';
import {
  calculateNetWorth, calculateMonthlySummary, calculateAvailableToSpend, calculateHistoricalTrend
} from '../lib/calculations';
import { formatNaira, formatUSD, formatCompact } from '../lib/format';
import GoalRow from '../components/GoalRow';
import Modal from '../components/Modal';
import ImpulseInsight from '../components/ImpulseInsight';
import MonthPicker from '../components/MonthPicker';
import { useRegisterRefresh } from '../hooks/RefreshContext';
import { Amount, EyeToggle } from '../components/BalanceVisibility';

const COLORS = [
  '#B8935F', '#8FA98A', '#5A7F9F', '#B87C6B',
  '#9F8FA9', '#7FA9BF', '#D4A373', '#A98FA9'
];

// Vertical range for the net worth trend chart. Zero is always inside the range:
// it sits on the bottom edge when nothing is negative, on the top edge when nothing
// is positive, and has room on both sides when the line crosses zero
const getTrendDomain = (trend) => {
  const values = (trend || []).map((point) => point.value).filter((v) => Number.isFinite(v));
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  if (low === 0 && high === 0) return [-1000, 1000];
  const pad = (high - low) * 0.1;
  return [low < 0 ? low - pad : 0, high > 0 ? high + pad : 0];
};

// Round tick values (e.g. 0, 50k, 100k) that always fall inside the chart range
const getTrendTicks = ([min, max]) => {
  const rough = (max - min) / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const ratio = rough / magnitude;
  const step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * magnitude;
  const ticks = [];
  for (let i = Math.ceil(min / step); i * step <= max; i++) ticks.push(i * step || 0);
  return ticks;
};

// Compact Naira with the minus sign in front (e.g. -₦50k), for the chart axis
const formatAxisNaira = (n) => (n < 0 ? '-' + formatCompact(Math.abs(n)) : formatCompact(n));

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
    trend: [],
    accounts: []
  });
  const [rawData, setRawData] = useState({ transactions: [], accounts: [], exchangeRate: 1, goals: [] });
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payingGoal, setPayingGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [insightTab, setInsightTab] = useState('breakdown');
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

  const trendData = useMemo(() => {
    return calculateHistoricalTrend(rawData.transactions, rawData.accounts, rawData.exchangeRate, rawData.goals);
  }, [rawData.transactions, rawData.accounts, rawData.exchangeRate, rawData.goals]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [transactions, goals, accounts, rate, impulseBudget] = await Promise.all([
          getTransactions(),
          getGoals(),
          getAccounts(),
          getSetting('exchange_rate'),
          getSetting('impulse_budget')
        ]);

        const safeRate = rate || 1;
        // V2 FIX: Added goals to rawData
        setRawData({ transactions, accounts: accounts || [], exchangeRate: safeRate, goals });

        const prevMonthDate = new Date(`${currentMonth}-01`);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);

        const currentMonthTxs = transactions.filter((tx) => tx.date.startsWith(currentMonth));
        const prevMonthTxs = transactions.filter((tx) => tx.date.startsWith(prevMonthKey));

        const summary = calculateMonthlySummary(currentMonthTxs, currentMonth, safeRate);
        const prevSummary = calculateMonthlySummary(prevMonthTxs, prevMonthKey, safeRate);

        // V2 FIX: Added goals as 5th argument
        const netWorthData = calculateNetWorth(transactions, accounts || [], safeRate, null, goals);
        // V2 FIX: Removed goals argument
        const availableBalance = calculateAvailableToSpend(netWorthData);

        const currentDelta = summary.income - summary.totalOutflow;
        const prevDelta = prevSummary.income - prevSummary.totalOutflow;
        let percentageChange = 0;
        if (prevDelta !== 0) {
          percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
        }

        const breakdownMap = {};
        currentMonthTxs
          .filter((tx) => tx.type === 'expense' || tx.type === 'family_support')
          .forEach((tx) => {
            const category = tx.category || tx.person || 'Other';
            const amount = tx.currency === 'USD' ? tx.amount * safeRate : tx.amount;
            breakdownMap[category] = (breakdownMap[category] || 0) + amount;
          });

        const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
          name,
          value
        }));

        setData({
          netWorth: netWorthData.total,
          availableBalance,
          income: summary.income,
          expenses: summary.totalOutflow,
          impulseTotal: summary.impulseTotal,
          impulsePercentage: summary.impulsePercentage,
          impulseBudget,
          goals,
          expenseBreakdown,
          monthlyChange: currentDelta,
          percentageChange,
          trend: trendData,
          accounts: netWorthData.accounts
        });
      } catch (error) {
        console.error("Dashboard failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentMonth, trendData]);

  const refreshData = useCallback(async () => {
    try {
      const [transactions, goals, accounts, rate, impulseBudget] = await Promise.all([
        getTransactions(),
        getGoals(),
        getAccounts(),
        getSetting('exchange_rate'),
        getSetting('impulse_budget')
      ]);

      const safeRate = rate || 1;
      // V2 FIX: Added goals to rawData
      setRawData({ transactions, accounts: accounts || [], exchangeRate: safeRate, goals });

      // V2 FIX: Added goals as 5th argument
      const netWorthData = calculateNetWorth(transactions, accounts || [], safeRate, null, goals);
      // V2 FIX: Removed goals argument
      const availableBalance = calculateAvailableToSpend(netWorthData);

      const prevMonthDate = new Date(`${currentMonth}-01`);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);

      const currentMonthTxs = transactions.filter((tx) => tx.date.startsWith(currentMonth));
      const prevMonthTxs = transactions.filter((tx) => tx.date.startsWith(prevMonthKey));

      const summary = calculateMonthlySummary(currentMonthTxs, currentMonth, safeRate);
      const prevSummary = calculateMonthlySummary(prevMonthTxs, prevMonthKey, safeRate);

      const currentDelta = summary.income - summary.totalOutflow;
      const prevDelta = prevSummary.income - prevSummary.totalOutflow;
      let percentageChange = 0;
      if (prevDelta !== 0) {
        percentageChange = ((currentDelta - prevDelta) / Math.abs(prevDelta)) * 100;
      }

      const breakdownMap = {};
      currentMonthTxs
        .filter((tx) => tx.type === 'expense' || tx.type === 'family_support')
        .forEach((tx) => {
          const category = tx.category || tx.person || 'Other';
          const amount = tx.currency === 'USD' ? tx.amount * safeRate : tx.amount;
          breakdownMap[category] = (breakdownMap[category] || 0) + amount;
        });

      const expenseBreakdown = Object.entries(breakdownMap).map(([name, value]) => ({
        name,
        value
      }));

      setData((prev) => ({
        ...prev,
        goals,
        accounts: netWorthData.accounts,
        netWorth: netWorthData.total,
        availableBalance,
        income: summary.income,
        expenses: summary.totalOutflow,
        impulseTotal: summary.impulseTotal,
        impulsePercentage: summary.impulsePercentage,
        impulseBudget,
        expenseBreakdown,
        monthlyChange: currentDelta,
        percentageChange,
        trend: trendData
      }));
    } catch (error) {
      console.error("Dashboard failed to refresh data:", error);
    }
  }, [currentMonth, trendData]);

  useRegisterRefresh(refreshData);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0 || !payingGoal || !payForm.account_id) return;

    await addTransaction({
      type: 'goal_transfer',
      category: 'Goal Payment',
      amount,
      date: payForm.date,
      note: payForm.note || `Paid for ${payingGoal.name}`,
      impulse: false,
      goal_id: payingGoal.id,
      account_id: payForm.account_id
    });

    let newCurrent = payingGoal.current + amount;
    if (newCurrent > payingGoal.target) {
      newCurrent = payingGoal.target;
    }
    await updateGoal(payingGoal.id, { current: newCurrent });
    await refreshData();
    setPayingGoal(null);
    setPayForm({
      amount: '',
      account_id: '',
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

  const activeGoals = data.goals.filter((goal) => goal.current < goal.target);
  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (loading) {
    return <div className="loading">Loading your finances...</div>;
  }

  return (
    <div className="screen dashboard-screen">
      
      {/* =========================================
          DESKTOP GRID LAYOUT
          ========================================= */}
      <div className="dashboard-grid">
        
        {/* Row 1: Header Text */}
        <div className="grid-item-header desktop-only">
          <h1 className="screen-title" style={{ margin: 0 }}>Your financial overview</h1>
          <p className="screen-sub" style={{ margin: '4px 0 0 0' }}>A clear view of your money, goals, and progress.</p>
        </div>

        {/* Row 1: Month Picker */}
        <div className="grid-item-monthpicker desktop-only">
          <MonthPicker currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>

        {/* Row 1 (Mobile): Full width mobile header block */}
        <div className="grid-item-mobile mobile-only" style={{ gridColumn: '1 / -1' }}>
          <MonthPicker currentMonth={currentMonth} onChange={setCurrentMonth} />
          <header className="page-header">
            <p className="eyebrow eyebrow-row">Total Net Worth<EyeToggle /></p>
            <h1 className="hero-number"><Amount value={formatNaira(data.netWorth)} /></h1>
            <p className="hero-sub" style={{ color: 'var(--accent-gold)', marginTop: 8 }}>
              Available to spend: <Amount value={formatNaira(data.availableBalance)} />
            </p>
            {(data.income > 0 || data.expenses > 0) && (
              <div className="networth-change">
                <span className={`change-value ${
                  data.monthlyChange > 0 ? 'positive' : 
                  data.monthlyChange < 0 ? 'negative' : 
                  'neutral'
                }`}>
                  {data.monthlyChange > 0 ? '▲' : data.monthlyChange < 0 ? '▼' : '▶'} <Amount value={formatNaira(Math.abs(data.monthlyChange))} />
                </span>
                <span className="change-percent">
                  ({data.percentageChange.toFixed(1)}% vs last month)
                </span>
              </div>
            )}
          </header>
          <section className="grid-two">
            <div className="summary-block">
              <p className="summary-label">Income this month</p>
              <p className="summary-value"><Amount value={formatNaira(data.income)} /></p>
            </div>
            <div className="summary-block">
              <p className="summary-label">Outflow this month</p>
              <p className="summary-value"><Amount value={formatNaira(data.expenses)} /></p>
            </div>
          </section>
        </div>

        {/* Row 2: Net Worth Card */}
        <div className="grid-item-networth dashboard-card desktop-only">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                TOTAL NET WORTH <EyeToggle />
              </p>
              <h1 className="hero-number" style={{ fontSize: '36px', margin: '8px 0' }}>
                <Amount value={formatNaira(data.netWorth)} />
              </h1>
              <p className="hero-sub" style={{ color: 'var(--accent-gold)', marginTop: 8 }}>
                Available to spend · <Amount value={formatNaira(data.availableBalance)} />
              </p>
              {(data.income > 0 || data.expenses > 0) && (
                <div className="networth-change" style={{ marginTop: '16px' }}>
                  <span className={`change-value ${
                    data.monthlyChange > 0 ? 'positive' : 
                    data.monthlyChange < 0 ? 'negative' : 'neutral'
                  }`}>
                    {data.monthlyChange > 0 ? '▲' : data.monthlyChange < 0 ? '▼' : '▶'} <Amount value={formatNaira(Math.abs(data.monthlyChange))} />
                  </span>
                  <span className="change-percent">
                    ({data.percentageChange.toFixed(1)}% vs last month)
                  </span>
                </div>
              )}
            </div>
            <div style={{ width: '120px', height: '60px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8935F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#B8935F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#B8935F" fill="url(#colorNetWorth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Stats Grid */}
        <div className="grid-item-stats stats-grid desktop-only">
          <div className="stat-card">
            <p className="stat-label">Income this month</p>
            <p className="stat-value"><Amount value={formatNaira(data.income)} /></p>
            <p className="stat-trend positive">↑ 8.4% from September</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Outflow this month</p>
            <p className="stat-value"><Amount value={formatNaira(data.expenses)} /></p>
            <p className="stat-trend negative">↑ 2.1% from September</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Savings rate</p>
            <p className="stat-value">45.2%</p>
            <p className="stat-trend stat-trend-green">Above your 40% target</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Active goals</p>
            <p className="stat-value">4 goals</p>
            <p className="stat-trend stat-trend-green">2 on track this month</p>
          </div>
        </div>

        {/* Row 3: Spending Insights */}
        <div className="grid-item-spending">
          {/* Desktop Purpose-Built Card */}
          <div className="desktop-only dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Spending insights</h2>
                <p className="dashboard-card-sub">Where your money went this month</p>
              </div>
              <button className="btn-link all-goals-link">View report ↗</button>
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ flex: 1, height: '200px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={data.expenseBreakdown} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={2} 
                      dataKey="value"
                    >
                      {data.expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke='none' />
                      ))}
                      <Label 
                        content={({ viewBox }) => {
                          if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="central">
                                <tspan x={viewBox.cx} y={viewBox.cy - 8} style={{ fill: 'var(--text-bright)', fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-serif)' }}>
                                  ₦685.4k
                                </tspan>
                                <tspan x={viewBox.cx} y={viewBox.cy + 12} style={{ fill: 'var(--text-muted)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                                  TOTAL OUTFLOW
                                </tspan>
                              </text>
                            );
                          }
                          return null;
                        }} 
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                {data.expenseBreakdown.map((entry, index) => {
                  const percentage = Math.round((entry.value / data.expenses) * 100);
                  return (
                    <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                        {entry.name}
                      </div>
                      <span>{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Original Structure */}
          {data.expenses > 0 && (
            <section className="section mobile-only">
              <h2 className="section-title">Spending Insights</h2>
              <div className="insight-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
                <button type="button" className={`btn ${insightTab === 'breakdown' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setInsightTab('breakdown')} style={{ whiteSpace: 'nowrap' }}>Where My Money Went</button>
                <button type="button" className={`btn ${insightTab === 'impulse' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setInsightTab('impulse')} style={{ whiteSpace: 'nowrap' }}>Impulse</button>
              </div>
              {insightTab === 'breakdown' && (
                <div className="chart-wrap" style={{ padding: '16px 0' }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={data.expenseBreakdown} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
                        {data.expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke='none' />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 6, color: 'var(--chart-tooltip-text)' }} formatter={(value, name) => [formatNaira(value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-legend">
                    {data.expenseBreakdown.map((entry, index) => {
                      const percentage = Math.round((entry.value / data.expenses) * 100);
                      return (
                        <div key={entry.name} className="legend-item">
                          <span className="legend-dot" style={{ background: COLORS[index % COLORS.length] }} />
                          <span className="legend-text">{entry.name}</span>
                          <span className="legend-value">{formatNaira(entry.value)} ({percentage}%)</span>
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
        </div>

        {/* Row 3: Goals in Motion */}
        <div className="grid-item-goals">
          {/* Desktop Purpose-Built Card */}
          <div className="desktop-only dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Goals in motion</h2>
                <p className="dashboard-card-sub">Keep your priorities moving forward.</p>
              </div>
              <button className="btn-link all-goals-link">All goals ↗</button>
            </div>
            <div className="goals-wrap">
              {sortedActiveGoals.slice(0, 3).map((goal) => {
                const fundingTotal = (Number(goal.current) || 0) + (Number(goal.execution_total) || 0);
                const fundingPct = Math.min(100, Math.round((fundingTotal / goal.target) * 100));
                return (
                  <div key={goal.id} className="desktop-goal-row">
                    <div className="desktop-goal-header">
                      <span className="desktop-goal-name">{goal.name}</span>
                      <span className="desktop-goal-pct">{fundingPct}%</span>
                    </div>
                    <div className="goal-bar-track">
                      <div className="goal-bar-fill" style={{ width: `${fundingPct}%` }} />
                    </div>
                    <div className="desktop-goal-footer">
                      <span>{formatNaira(fundingTotal)} saved</span>
                      <span>{formatNaira(goal.target)}</span>
                    </div>
                  </div>
                );
              })}
              {sortedActiveGoals.length === 0 && (
                <p className="hint-text">No active goals right now. Check the Goals tab to add one!</p>
              )}
            </div>
          </div>

          {/* Mobile Original Structure */}
          <section className="section mobile-only">
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
                      account_id: '',
                      date: new Date().toISOString().slice(0, 10),
                      note: ''
                    });
                    setPayingGoal(selectedGoal);
                  }}
                />
              ))}
              {sortedActiveGoals.length === 0 && (
                <p className="hint-text">No active goals right now. Check the Goals tab to add one!</p>
              )}
            </div>
          </section>
        </div>

        {/* Row 4: Net Worth Trend */}
        <div className="grid-item-trend">
          {/* Desktop Purpose-Built Card */}
          <div className="desktop-only dashboard-card">
            <div className="dashboard-card-header">
              <div>
                <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Net worth trend</h2>
                <p className="dashboard-card-sub">Your balance over the last six months</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B8935F', display: 'inline-block' }}></span>
                Net worth
              </div>
            </div>
            <div className="chart-wrap" style={{ background: 'transparent', border: 'none' }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.trend}>
                  {getTrendTicks(getTrendDomain(data.trend)).filter((tick) => tick !== 0).map((tick) => (
                    <ReferenceLine key={tick} y={tick} stroke="#2A3B4D" strokeDasharray="3 3" zIndex={300} />
                  ))}
                  <XAxis dataKey="month" stroke="#5A6B7A" tick={{ fill: '#8A98A5', fontSize: 12, dy:10 }} axisLine={{ stroke: '#2A3B4D' }} tickLine={false} />
                  <YAxis domain={getTrendDomain(data.trend)} ticks={getTrendTicks(getTrendDomain(data.trend))} tickFormatter={formatAxisNaira} width={48} tick={{ fill: '#8A98A5', fontSize: 11, textAnchor: 'middle', dx: -20 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 4, color: 'var(--chart-tooltip-text)' }} formatter={(value) => (value < 0 ? [<span style={{ color: 'var(--chart-neg)' }}>{'-' + formatNaira(Math.abs(value))}</span>, 'Net worth'] : [formatNaira(value), 'Net worth'])} />
                  <ReferenceLine y={0} stroke="#8A98A5" strokeOpacity={0.6} zIndex={350} />
                  <Line type="monotone" dataKey="value" stroke="#B8935F" strokeWidth={2} dot={({ cx, cy, payload, index }) => (payload.value < 0 ? <circle key={`dot-${index}`} cx={cx} cy={cy} r={6} fill="#B87C6B" stroke="#E4B4A4" strokeWidth={1.5} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill="#B8935F" />)} activeDot={{ r: 7, fill: '#F3EEE4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mobile Original Structure */}
          <section className="section mobile-only">
            <h2 className="section-title">Net worth trend</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.trend}>
                  {getTrendTicks(getTrendDomain(data.trend)).filter((tick) => tick !== 0).map((tick) => (
                    <ReferenceLine key={tick} y={tick} stroke="#2A3B4D" strokeDasharray="3 3" zIndex={300} />
                  ))}
                  <XAxis dataKey="month" stroke="#5A6B7A" tick={{ fill: '#8A98A5', fontSize: 12, dy:10 }} axisLine={{ stroke: '#2A3B4D' }} tickLine={false} />
                  <YAxis domain={getTrendDomain(data.trend)} ticks={getTrendTicks(getTrendDomain(data.trend))} tickFormatter={formatAxisNaira} width={48} tick={{ fill: '#8A98A5', fontSize: 11, textAnchor: 'middle', dx: -20 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 4, color: 'var(--chart-tooltip-text)' }} formatter={(value) => (value < 0 ? [<span style={{ color: 'var(--chart-neg)' }}>{'-' + formatNaira(Math.abs(value))}</span>, 'Net worth'] : [formatNaira(value), 'Net worth'])} />
                  <ReferenceLine y={0} stroke="#8A98A5" strokeOpacity={0.6} zIndex={350} />
                  <Line type="monotone" dataKey="value" stroke="#B8935F" strokeWidth={2} dot={({ cx, cy, payload, index }) => (payload.value < 0 ? <circle key={`dot-${index}`} cx={cx} cy={cy} r={6} fill="#B87C6B" stroke="#E4B4A4" strokeWidth={1.5} /> : <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill="#B8935F" />)} activeDot={{ r: 7, fill: '#F3EEE4' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Row 4: Account Snapshot */}
        <div className="grid-item-snapshot dashboard-card desktop-only">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Account snapshot</h2>
              <p className="dashboard-card-sub">Balances across your accounts</p>
            </div>
            <button className="btn-link all-goals-link">Accounts ↗</button>
          </div>
          <div className="account-snapshot-row">
            <div className="account-snapshot-left">
              <div className="account-icon">₦</div>
              <div>
                <p className="account-name">Main savings</p>
                <p className="account-type">Savings account</p>
              </div>
            </div>
            <div className="account-balance">
              <p className="account-amount">₦4,850,000</p>
              <p className="account-currency">NGN · Available</p>
            </div>
          </div>
          <div className="account-snapshot-row">
            <div className="account-snapshot-left">
              <div className="account-icon">$</div>
              <div>
                <p className="account-name">Dollar reserve</p>
                <p className="account-type">Foreign currency</p>
              </div>
            </div>
            <div className="account-balance">
              <p className="account-amount">$2,100</p>
              <p className="account-currency">USD · Available</p>
            </div>
          </div>
          <div className="account-snapshot-row">
            <div className="account-snapshot-left">
              <div className="account-icon">▣</div>
              <div>
                <p className="account-name">Everyday spending</p>
                <p className="account-type">Current account</p>
              </div>
            </div>
            <div className="account-balance">
              <p className="account-amount">₦285,400</p>
              <p className="account-currency">NGN · Available</p>
            </div>
          </div>
        </div>

        {/* Row 5: Impulse Spending */}
        <div className="grid-item-impulse dashboard-card desktop-only">
          <div className="dashboard-card-header">
            <div>
              <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Impulse spending</h2>
              <p className="dashboard-card-sub">Discretionary purchases this month</p>
            </div>
            <span className="tag-impulse" style={{ background: 'rgba(143, 169, 138, 0.2)', color: 'var(--accent-green)' }}>Within budget</span>
          </div>
          <div style={{ marginTop: '16px' }}>
            <p className="stat-label">SPENT SO FAR</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '8px 0' }}>
              <h1 className="hero-number" style={{ fontSize: '24px', margin: 0 }}>₦42,500</h1>
              <div style={{ textAlign: 'right' }}>
                <p className="stat-label" style={{ margin: 0 }}>60,000 budget</p>
                <p className="stat-value" style={{ fontSize: '16px' }}>71%</p>
              </div>
            </div>
            <div className="goal-bar-track">
              <div className="goal-bar-fill" style={{ width: '71%', background: 'var(--accent-green)' }} />
            </div>
          </div>
        </div>

      </div>

      {/* =========================================
          MODALS (Untouched)
          ========================================= */}
      <Modal isOpen={!!payingGoal} onClose={() => setPayingGoal(null)} title={`Pay towards ${payingGoal?.name}`}>
        <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">Amount<input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Pay From Account<select value={payForm.account_id} onChange={(e) => setPayForm({ ...payForm, account_id: e.target.value })} className="form-select" required><option value="">Select an account</option>{data.accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency === 'NGN' ? `₦${Number(acc.balance).toLocaleString()}` : `$${Number(acc.balance).toLocaleString()}`})</option>))}</select></label>
          <label className="form-label">Date<input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Note<input type="text" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} className="form-input" /></label>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setPayingGoal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Confirm</button></div>
        </form>
      </Modal>
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Goal">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="form-label">Name<input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Target<input type="number" value={editForm.target} onChange={(e) => setEditForm({ ...editForm, target: e.target.value })} className="form-input" required /></label>
          <label className="form-label">Deadline<input type="date" value={editForm.deadline} onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })} className="form-input" /></label>
          <div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditingGoal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Update</button></div>
        </form>
      </Modal>
    </div>
  );
}