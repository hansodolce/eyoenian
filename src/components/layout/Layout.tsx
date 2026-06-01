import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()

  return (
    <div className="flex h-screen min-h-0 bg-secondary-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="bg-white border-b border-secondary-200 px-3 lg:px-6 py-2 lg:py-3 flex items-center justify-between sticky top-0 z-30 no-print" style={{ paddingLeft: 'env(safe-area-inset-left, 0.75rem)', paddingRight: 'env(safe-area-inset-right, 0.75rem)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2.5 -ml-1 text-secondary-600 hover:bg-secondary-100 rounded-xl transition-colors active:bg-secondary-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Menu">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/icons/icon-192x192.png" alt="Eyo-Enian" className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg" />
              <h1 className="text-base lg:text-lg font-semibold text-secondary-900 hidden sm:block">Eyo-Enian</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="text-xs sm:text-sm text-secondary-500 hidden sm:inline truncate max-w-[120px] lg:max-w-[150px]">{profile?.full_name}</span>
            <div className="w-7 h-7 rounded-full bg-secondary-200 text-secondary-600 flex items-center justify-center text-xs font-medium sm:hidden">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <button
              onClick={signOut}
              className="p-2.5 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors active:bg-secondary-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6" style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
          <Outlet />
        </main>
        <OfflineBanner />
      </div>
    </div>
  )
}
