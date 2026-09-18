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
    <div className="month-picker">
      <button onClick={handlePrev} className="btn-icon">←</button>
      <span className="month-label">{monthName}</span>
      <button onClick={handleNext} className="btn-icon">→</button>
    </div>
  );
}