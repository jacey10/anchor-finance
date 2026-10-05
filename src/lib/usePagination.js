import { useState, useEffect, useMemo } from 'react';

export const PAGE_SIZE = 7;

/**
 * Slices an already-filtered list into pages.
 *
 * @param items     the full (already filtered) list
 * @param resetKey  any value; when it changes, the list goes back to page 1
 *                  (e.g. `${month}|${tab}`)
 * @param pageSize  entries per page (defaults to PAGE_SIZE)
 */
export default function usePagination(items, resetKey = '', pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp so deleting the last entry on the last page doesn't leave an empty page
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize]
  );

  return {
    page: currentPage,
    setPage,
    totalPages,
    totalItems: items.length,
    pageItems
  };
}
