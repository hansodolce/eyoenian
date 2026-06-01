import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { AdminLogin } from '@/pages/auth/AdminLogin'
import { GestionnaireLogin } from '@/pages/auth/GestionnaireLogin'
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
import { GestionnairesPage } from '@/pages/gestionnaires/GestionnairesPage'
import { ImportPage } from '@/pages/import/ImportPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { ConsultationPage } from '@/pages/consultation/ConsultationPage'
import { LoadingSpinner } from '@/components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile || profile.role === 'member' as any) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile || profile.role === 'member' as any) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/login/gestionnaire" element={<GestionnaireLogin />} />
            <Route path="/consultation" element={<ConsultationPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
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
              <Route path="/gestionnaires" element={<AdminRoute><GestionnairesPage /></AdminRoute>} />
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
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
