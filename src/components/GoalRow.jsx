import React from 'react';
import { formatCompact } from '../lib/format';

export default function GoalRow({ goal, onEdit, onDelete, onPay }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));

  return (
    <div className="goal-row">
      <div className="goal-row-top">
        <span className="goal-name">{goal.name}</span>
        <span className="goal-pct">{pct}%</span>
      </div>
      <div className="goal-bar-track">
        <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-numbers">
        {formatCompact(goal.current)} of {formatCompact(goal.target)}
        {goal.deadline && <span className="goal-deadline"> · Due {goal.deadline}</span>}
      </div>
      <div className="goal-actions">
        <button className="btn-link" onClick={() => onPay(goal)}>Pay from goal</button>
        <button className="btn-link" onClick={() => onEdit(goal)}>Edit</button>
        <button className="btn-link text-danger" onClick={() => onDelete(goal.id)}>Delete</button>
      </div>
    </div>
  );
}