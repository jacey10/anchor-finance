import React from 'react';

// Builds the list of page buttons, collapsing long ranges into "…"
// e.g. 1 … 4 5 6 … 12
const getPageList = (page, total) => {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const wanted = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...wanted].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const list = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) list.push(`gap-${i}`);
    list.push(p);
  });
  return list;
};

const buttonStyle = (active = false, disabled = false) => ({
  minWidth: 38,
  height: 38,
  padding: '0 10px',
  borderRadius: 8,
  border: `1px solid ${active ? 'var(--accent-gold)' : 'var(--border, rgba(255, 255, 255, 0.14))'}`,
  background: active ? 'var(--accent-gold)' : 'transparent',
  color: active ? '#1b1307' : 'var(--text-primary, inherit)',
  fontWeight: active ? 700 : 500,
  fontSize: 14,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.35 : 1
});

export default function Pagination({ page, totalPages, totalItems, onChange, itemLabel = 'entries' }) {
  // Nothing to paginate
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 20 }}
    >
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Page {page} of {totalPages} ({totalItems} {itemLabel})
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          style={buttonStyle(false, page === 1)}
        >
          ‹
        </button>

        {getPageList(page, totalPages).map(item =>
          typeof item === 'string' ? (
            <span key={item} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onChange(item)}
              style={buttonStyle(item === page)}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          style={buttonStyle(false, page === totalPages)}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
