import React, { useState } from 'react';
import { formatCompact, formatNaira } from '../lib/format';
import { dismissGoalAttention } from '../lib/storage';

export default function GoalRow({
  goal,
  onEdit,
  onDelete,
  onPay,
  onWithdraw,
  onMarkAsPaid,
  onUnmarkAsPaid,
  onRefreshGoals
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAttentionDialog, setShowAttentionDialog] = useState(false);

  // Calculate funding percentage (total money that flowed into the goal)
  const fundingTotal = (Number(goal.current) || 0) + (Number(goal.execution_total) || 0);
  const fundingPct = Math.min(100, Math.round((fundingTotal / goal.target) * 100));

  // Calculate execution percentage (money spent for the goal's intended purpose)
  const executionTotal = Number(goal.execution_total) || 0;
  const executionPct = Math.min(100, Math.round((executionTotal / goal.target) * 100));
  const remainingToAchieve = goal.target - executionTotal;

  // Virtual balance = cash currently sitting in the goal
  const virtualBalance = Number(goal.current) || 0;

  // Check if goal needs attention (Action Required badge)
  const needsAttention =
    goal.was_funded === true &&
    virtualBalance === 0 &&
    executionTotal === 0 &&
    goal.is_paid === false &&
    goal.attention_dismissed === false;

  const isCompleted = fundingPct >= 100;
  const isAchieved = goal.is_paid;
  const hasBalance = virtualBalance > 0;

  const handleKeepGoal = async () => {
    await dismissGoalAttention(goal.id);
    setShowAttentionDialog(false);
    if (onRefreshGoals) onRefreshGoals();
  };

  const handleDeleteGoal = async () => {
    if (onDelete) onDelete(goal.id);
    setShowAttentionDialog(false);
  };

  return (
    <div className="goal-row" style={{ position: 'relative' }}>
      {/* Action Required Badge */}
      {needsAttention && (
        <button
          className="action-required-badge"
          onClick={() => setShowAttentionDialog(true)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#e74c3c',
            border: 'none',
            cursor: 'pointer',
            animation: 'pulse 2s infinite',
            padding: 0
          }}
          title="Action Required"
        />
      )}

      <div className="goal-row-top">
        <span className="goal-name">{goal.name}</span>
        <span className="goal-pct">{fundingPct}%</span>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
        Funding
      </div>

      <div className="goal-bar-track">
        <div
          className={`goal-bar-fill ${isAchieved ? 'is-paid' : ''}`}
          style={{ width: `${fundingPct}%` }}
        />
      </div>

      <div className="goal-numbers">
        {formatCompact(fundingTotal)} of {formatCompact(goal.target)}
        {goal.deadline && (
          <span className="goal-deadline"> · Due {goal.deadline}</span>
        )}
      </div>

      <button
        className="btn-link"
        onClick={() => setShowDetails(!showDetails)}
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 8,
          marginBottom: showDetails ? 12 : 0,
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {showDetails ? '▼ Hide Details' : '▶ Show Details'}
      </button>

      {showDetails && (
        <div className="execution-details" style={{
          background: 'rgba(184, 147, 95, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
          marginBottom: 12
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Execution</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{executionPct}%</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {formatNaira(executionTotal)} / {formatNaira(goal.target)}
            </div>
            <div className="goal-bar-track" style={{ height: 6 }}>
              <div
                className="goal-bar-fill"
                style={{ width: `${executionPct}%`, background: '#2ecc71' }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {formatNaira(remainingToAchieve)} remaining to achieve goal
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Virtual Balance
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {formatNaira(virtualBalance)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Cash sitting in this goal
            </div>
          </div>
        </div>
      )}

      <div className="goal-actions">
        {isAchieved ? (
          <>
            {onUnmarkAsPaid && (
              <button className="btn-link" onClick={() => onUnmarkAsPaid(goal)}>
                Unmark as Paid
              </button>
            )}
            {!hasBalance && onDelete && (
              <button className="btn-link text-danger" onClick={() => onDelete(goal.id)}>
                Delete
              </button>
            )}
          </>
        ) : (
          <>
            {isCompleted && onMarkAsPaid && (
              <button className="btn-link" onClick={() => onMarkAsPaid(goal)}>
                Mark as Paid
              </button>
            )}
            {hasBalance && onWithdraw && (
              <button className="btn-link" onClick={() => onWithdraw(goal)}>
                Withdraw
              </button>
            )}
            {!isCompleted && onPay && (
              <button className="btn-link" onClick={() => onPay(goal)}>
                Pay towards Goal
              </button>
            )}
            {onEdit && (
              <button className="btn-link" onClick={() => onEdit(goal)}>
                Edit
              </button>
            )}
            {!hasBalance && onDelete && (
              <button className="btn-link text-danger" onClick={() => onDelete(goal.id)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>

      {showAttentionDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            padding: 24,
            maxWidth: 400,
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
              Action Required
            </h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
              You saved for <strong style={{ color: 'var(--text-primary)' }}>{goal.name}</strong> but used the money for something else.
              Do you still want to keep this goal, or delete it?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={handleKeepGoal}
                style={{ flex: 1 }}
              >
                Keep Goal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeleteGoal}
                style={{ flex: 1, background: '#e74c3c' }}
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}