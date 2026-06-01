import { type ReactNode } from 'react'
import { cn } from '@/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-secondary-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-secondary-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3 flex-shrink-0">{children}</div>}
    </div>
  )
}
