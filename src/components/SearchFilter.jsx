import React from 'react';

export default function SearchFilter({ searchTerm, onSearchChange }) {
  return (
    <div className="search-filter">
      <input 
        type="text" 
        placeholder="Search notes, categories..." 
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
      {/* More filters can be added here later */}
    </div>
  );
}