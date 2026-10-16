import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNaira } from '../lib/format';

const COLORS = [
  '#B8935F', '#8FA98A', '#5A7F9F', '#B87C6B',
  '#9F8FA9', '#7FA9BF', '#D4A373', '#A98FA9'
];

export default function SpendingInsightsDesktop({ expenseBreakdown, expenses }) {
  return (
    <div className="dashboard-card spending-insights-card">
      <div className="dashboard-card-header">
        <div>
          <h2 className="dashboard-card-title section-title" style={{ margin: 0 }}>Spending insights</h2>
          <p className="dashboard-card-sub">Where your money went this month</p>
        </div>
        <button className="btn-link all-goals-link">View report ↗</button>
      </div>
      
      <div className="chart-wrap" style={{ padding: '16px 0', background: 'transparent', border: 'none' }}>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
              {expenseBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke='none' />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 6, color: 'var(--chart-tooltip-text)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value, name) => [formatNaira(value), name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pie-legend">
          {expenseBreakdown.map((entry, index) => {
            const percentage = Math.round((entry.value / expenses) * 100);
            return (
              <div key={entry.name} className="legend-item">
                <span className="legend-dot" style={{ background: COLORS[index % COLORS.length] }} />
                <span className="legend-text">{entry.name}</span>
                <span className="legend-value">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}