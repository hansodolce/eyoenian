import type { ReactNode } from 'react'
import { cn } from '@/utils'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return <div className={cn('bg-white rounded-xl border border-secondary-200 shadow-sm', className)} onClick={onClick}>{children}</div>
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn('px-4 sm:px-6 py-3 sm:py-4 border-b border-secondary-200', className)}>{children}</div>
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn('p-4 sm:p-6', className)}>{children}</div>
}
