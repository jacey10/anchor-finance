import React from 'react';
import { formatCompact } from '../lib/format';

export default function GoalRow({ 
  goal, 
  onEdit, 
  onDelete, 
  onPay, 
  onMarkAsPaid, 
  onUnmarkAsPaid 
}) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const isCompleted = pct >= 100;

  return (
    <div className="goal-row">
      <div className="goal-row-top">
        <span className="goal-name">{goal.name}</span>
        <span className="goal-pct">{pct}%</span>
      </div>
      
      <div className="goal-bar-track">
        <div 
          className={`goal-bar-fill ${goal.is_paid ? 'is-paid' : ''}`} 
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
        {isCompleted && !goal.is_paid && onMarkAsPaid && (
          <button 
            className="btn-link" 
            onClick={() => onMarkAsPaid(goal)}
          >
            Mark as Paid
          </button>
        )}
        
        {goal.is_paid && onUnmarkAsPaid && (
          <button 
            className="btn-link" 
            onClick={() => onUnmarkAsPaid(goal)}
          >
            Unmark as Paid
          </button>
        )}
        
        <button 
          className="btn-link" 
          onClick={() => onPay(goal)}
        >
          Pay for goal
        </button>
        
        <button 
          className="btn-link" 
          onClick={() => onEdit(goal)}
        >
          Edit
        </button>
        
        {/* FIX: Only show Delete button if onDelete is explicitly provided */}
        {onDelete && (
          <button 
            className="btn-link text-danger" 
            onClick={() => onDelete(goal.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}