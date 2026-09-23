import React from 'react';

export default function WishlistRow({ item, onMarkAsGot, onUnmarkAsGot, onDelete }) {
  return (
    <div className="list-row">
      <div className="list-row-content">
        <div className="list-row-title">{item.name}</div>
        {item.note && (
          <div className="list-row-meta">{item.note}</div>
        )}
      </div>
      
      <div className="list-row-actions">
        {item.status === 'wishing' && onMarkAsGot && (
          <button className="btn-link" onClick={() => onMarkAsGot(item)}>
            Mark as Got
          </button>
        )}
        
        {item.status === 'got_it' && onUnmarkAsGot && (
          <button className="btn-link" onClick={() => onUnmarkAsGot(item)}>
            Unmark
          </button>
        )}
        
        {item.status === 'wishing' && onDelete && (
          <button className="delete-item-btn" onClick={() => onDelete(item.id)}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}