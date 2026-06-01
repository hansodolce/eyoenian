import { type ReactNode } from 'react'
import { cn } from '@/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  className?: string
}

export function StatCard({ icon, label, value, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-secondary-200 shadow-sm p-3 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] sm:text-sm font-medium text-secondary-500 truncate">{label}</p>
          <p className="text-sm sm:text-base xl:text-xl font-bold sm:mt-1 text-secondary-900">{value}</p>
        </div>
        <div className="p-1 sm:p-3 rounded-lg bg-primary-50 text-primary-600 flex-shrink-0 mt-0.5 sm:mt-0">
          {icon}
        </div>
      </div>
    </div>
  )
}
