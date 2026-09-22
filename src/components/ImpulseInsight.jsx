import React from 'react';
import { formatNaira } from '../lib/format';

// Impulse tab content for the Dashboard's Spending Insights section.
// Pure presentational — all figures are computed upstream by
// calculateMonthlySummary() and passed down as props.
//
// impulseBudget is optional. getSetting() returns 0 when a setting hasn't
// been configured (see lib/storage.js), so we treat 0/falsy the same as
// "no budget set" rather than a real ₦0 budget.
export default function ImpulseInsight({ impulseTotal, impulsePercentage, impulseBudget }) {
  const hasBudget = !!impulseBudget && impulseBudget > 0;

  const budgetUsedPercentage = hasBudget
    ? Math.min((impulseTotal / impulseBudget) * 100, 100)
    : 0;

  const budgetRemaining = hasBudget
    ? Math.max(impulseBudget - impulseTotal, 0)
    : 0;

  const isOverBudget = hasBudget && impulseTotal > impulseBudget;

  return (
    <div className="goal-row">
      <div style={{ textAlign: 'center' }}>
        <p className="summary-label">Impulse spending this month</p>

        <p className="hero-number" style={{ fontSize: '2rem', margin: '8px 0' }}>
          {formatNaira(impulseTotal)}
        </p>

        <p className="hero-sub">
          {impulsePercentage.toFixed(1)}% of your expense spending
        </p>
      </div>

      {/* Impulse-as-share-of-expenses progress bar (always shown) */}
      <div className="goal-bar-track" style={{ marginTop: 20 }}>
        <div
          className="goal-bar-fill"
          style={{ width: `${Math.min(impulsePercentage, 100)}%` }}
        />
      </div>

      {!hasBudget && (
        <p className="hint-text" style={{ marginTop: 12 }}>
          Impulse spending is tracked separately from your spending categories.
        </p>
      )}

      {/* Optional impulse budget block — only renders when a budget is set */}
      {hasBudget && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color, #2A3B4D)' }}>
          <div className="goal-row-top">
            <span className="goal-name">Impulse budget</span>
            <span className="goal-pct" style={{ color: isOverBudget ? 'var(--accent-red)' : undefined }}>
              {formatNaira(impulseTotal)} / {formatNaira(impulseBudget)}
            </span>
          </div>

          <div className="goal-bar-track">
            <div
              className={isOverBudget ? 'goal-bar-fill-danger' : 'goal-bar-fill'}
              style={{ width: `${budgetUsedPercentage}%` }}
            />
          </div>

          <p className="goal-numbers" style={{ color: isOverBudget ? 'var(--accent-red)' : undefined }}>
            {Math.round(budgetUsedPercentage)}% used
            {isOverBudget
              ? ` · ${formatNaira(impulseTotal - impulseBudget)} over budget`
              : ` · ${formatNaira(budgetRemaining)} remaining`}
          </p>
        </div>
      )}
    </div>
  );
}