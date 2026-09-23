import React from 'react';

export default function MonthPicker({ currentMonth, onChange }) {
  // currentMonth format: '2026-09'
  const date = new Date(currentMonth + '-01');
  const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrev = () => {
    date.setMonth(date.getMonth() - 1);
    onChange(date.toISOString().slice(0, 7));
  };

  const handleNext = () => {
    date.setMonth(date.getMonth() + 1);
    onChange(date.toISOString().slice(0, 7));
  };

  return (
    // FIX: Changed className from "month-picker" to "month-selector" 
    // to match the CSS in index.css
    <div className="month-selector">
      <button onClick={handlePrev} className="btn-icon" aria-label="Previous month">←</button>
      <span className="month-label">{monthName}</span>
      <button onClick={handleNext} className="btn-icon" aria-label="Next month">→</button>
    </div>
  );
}