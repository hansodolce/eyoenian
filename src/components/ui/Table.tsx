import { cn } from '@/utils'

interface TableProps {
  headers: { key: string; label: string; className?: string }[]
  data: any[]
  renderRow: (item: any) => React.ReactNode
  onRowClick?: (item: any) => void
  className?: string
}

export function Table({ headers, data, renderRow, onRowClick, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-secondary-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary-50">
            {headers.map(h => (
              <th key={h.key} className={cn('px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider', h.className)}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-secondary-500">
                Aucune donnée trouvée
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={item.id || i}
                onClick={() => onRowClick?.(item)}
                className={cn('border-t border-secondary-100 transition-colors', onRowClick && 'cursor-pointer hover:bg-secondary-50/50')}
              >
                {renderRow(item)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
