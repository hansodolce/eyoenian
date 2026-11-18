import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { MembersPage } from '@/pages/members/MembersPage'
import { MemberDetailPage } from '@/pages/members/MemberDetailPage'
import { CotisationsAnnuellesPage } from '@/pages/cotisations/CotisationsAnnuellesPage'
import { CotisationsExceptionnellesPage } from '@/pages/cotisations/CotisationsExceptionnellesPage'
import { ContributionDetail } from '@/pages/cotisations/ContributionDetail'
import { DecaissementsPage } from '@/pages/decaissements/DecaissementsPage'
import { ReunionsPage } from '@/pages/reunions/ReunionsPage'
import { PresencesPage } from '@/pages/presences/PresencesPage'
import { RapportsPage } from '@/pages/rapports/RapportsPage'
import { ImportPage } from '@/pages/import/ImportPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ConsultationPage } from '@/pages/consultation/ConsultationPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/profile" element={<Navigate to="/settings" replace />} />
          <Route path="/gestionnaires" element={<Navigate to="/dashboard" replace />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/:id" element={<MemberDetailPage />} />
            <Route path="/cotisations-annuelles" element={<CotisationsAnnuellesPage />} />
            <Route path="/cotisations-annuelles/:id" element={<ContributionDetail type="annual" />} />
            <Route path="/cotisations-exceptionnelles" element={<CotisationsExceptionnellesPage />} />
            <Route path="/cotisations-exceptionnelles/:id" element={<ContributionDetail type="special" />} />
            <Route path="/decaissements" element={<DecaissementsPage />} />
            <Route path="/reunions" element={<ReunionsPage />} />
            <Route path="/presences" element={<PresencesPage />} />
            <Route path="/rapports" element={<RapportsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px' },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
