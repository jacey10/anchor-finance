import React from 'react';
import { formatCompact } from '../lib/format';

export default function GoalRow({
  goal,
  onEdit,
  onDelete,
  onPay,
  onWithdraw,
  onMarkAsPaid,
  onUnmarkAsPaid
}) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const isCompleted = pct >= 100;
  const isAchieved = goal.is_paid;
  const hasBalance = Number(goal.current) > 0;

  return (
    <div className="goal-row">
      <div className="goal-row-top">
        <span className="goal-name">{goal.name}</span>
        <span className="goal-pct">{pct}%</span>
      </div>

      <div className="goal-bar-track">
        <div
          className={`goal-bar-fill ${isAchieved ? 'is-paid' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="goal-numbers">
        {formatCompact(goal.current)} of {formatCompact(goal.target)}
        {goal.deadline && (
          <span className="goal-deadline"> · Due {goal.deadline}</span>
        )}
      </div>

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
    </div>
  );
}