import React from 'react';

export default function NoteRow({ note, onDelete }) {
  const dateLabel = new Date(note.created_at).toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="list-row">
      <div className="list-row-content">
        <div className="list-row-title" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
        <div className="list-row-meta">{dateLabel}</div>
      </div>
      
      <div className="list-row-actions">
        {onDelete && (
          <button className="delete-item-btn" onClick={() => onDelete(note.id)}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}