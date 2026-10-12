import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Genera rango de páginas visibles con elipsis
  function pages() {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    const result = [1];
    if (range[0] > 2) result.push('…');
    result.push(...range);
    if (range[range.length - 1] < totalPages - 1) result.push('…');
    if (totalPages > 1) result.push(totalPages);
    return result;
  }

  const btnBase =
    'inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1 flex-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className={`${btnBase} text-secondary-600 hover:bg-secondary-100`}
      >
        <ChevronLeft size={16} />
      </button>

      {pages().map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-secondary-400 text-sm select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={[
              btnBase,
              p === page
                ? 'bg-primary-600 text-white'
                : 'text-secondary-700 hover:bg-secondary-100',
            ].join(' ')}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Página siguiente"
        className={`${btnBase} text-secondary-600 hover:bg-secondary-100`}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
