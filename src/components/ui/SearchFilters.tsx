import { useState, useEffect } from 'react'
import { SearchInput } from './SearchInput'

interface FilterOption {
  value: string
  label: string
}

interface SearchFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: {
    key: string
    label: string
    options: FilterOption[]
    value: string
    onChange: (value: string) => void
  }[]
  className?: string
}

export function SearchFilters({ search, onSearchChange, searchPlaceholder, filters, className }: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder || 'Rechercher...'} />
        </div>
        {filters && filters.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg border text-sm transition-colors ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-secondary-300 text-secondary-600 hover:bg-secondary-50'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline ml-1">Filtres</span>
            </button>
            <div className="sm:hidden flex gap-2 overflow-x-auto pb-1">
              {filters.map(f => (
                <select
                  key={f.key}
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-secondary-300 text-sm bg-white text-secondary-700"
                >
                  <option value="">{f.label}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ))}
            </div>
          </div>
        )}
      </div>
      {showFilters && filters && (
        <div className="flex flex-wrap gap-3 mt-3 p-4 bg-white border border-secondary-200 rounded-xl">
          {filters.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-secondary-500 mb-1">{f.label}</label>
              <select
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-secondary-300 text-sm bg-white text-secondary-700"
              >
                <option value="">Tous</option>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
