import { cn } from '@/utils'

interface PaginationProps {
  current: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}

export function Pagination({ current, total, pageSize, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className={cn('flex items-center justify-between gap-4 pt-4', className)}>
      <p className="text-sm text-secondary-500">
        {Math.min((current - 1) * pageSize + 1, total)}–{Math.min(current * pageSize, total)} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {pages.map((p, i) => (
          p === '...' ? (
            <span key={`e${i}`} className="px-2 text-secondary-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === current ? 'bg-primary-600 text-white' : 'text-secondary-600 hover:bg-secondary-100'
              }`}
            >
              {p}
            </button>
          )
        ))}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current >= totalPages}
          className="p-2 rounded-lg text-secondary-600 hover:bg-secondary-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  )
}
