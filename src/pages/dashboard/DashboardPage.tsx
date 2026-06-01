import { useNavigate } from 'react-router-dom'
import { Card, CardBody, CardHeader, StatCard, LoadingSpinner, PageHeader } from '@/components/ui'
import { useDashboardStats, useMembers } from '@/services/queries'
import { formatCurrency } from '@/utils'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: members } = useMembers()
  const navigate = useNavigate()

  if (isLoading) return <LoadingSpinner />

  const activeMembers = (members || []).filter(m => m.statut === 'Actif')
  const inactiveMembers = (members || []).filter(m => m.statut === 'Inactif')

  const pieData = [
    { name: 'Membres actifs', value: stats?.actifs || 0 },
    { name: 'Membres inactifs', value: stats?.inactifs || 0 },
  ]

  const financeData = [
    { name: 'Recettes', value: stats?.recettes || 0 },
    { name: 'Dépenses', value: stats?.depenses || 0 },
    { name: 'Solde', value: Math.max(0, stats?.solde || 0) },
  ]

  const recentMembers = (members || []).slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre association" />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-4">
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          label="Total"
          value={stats?.total || 0}
        />
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Actifs"
          value={stats?.actifs || 0}
        />
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Impayés"
          value={stats?.impayes || 0}
        />
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Recettes"
          value={formatCurrency(stats?.recettes || 0)}
        />
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          label="Dépenses"
          value={formatCurrency(stats?.depenses || 0)}
        />
        <StatCard
          icon={<svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          label="Solde"
          value={formatCurrency(stats?.solde || 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">Statistiques membres</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
              <div className="w-full max-w-[180px] sm:max-w-[200px] h-40 sm:h-52 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2 w-full">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-1.5 sm:p-3 bg-secondary-50 rounded-lg">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-[11px] sm:text-sm text-secondary-700 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold flex-shrink-0">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">Situation financière</h3>
          </CardHeader>
          <CardBody>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {financeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">Actions rapides</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <button onClick={() => navigate('/members')} className="p-2.5 sm:p-4 bg-primary-50 rounded-xl text-left hover:bg-primary-100 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary-600 mb-1 sm:mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                <p className="text-[11px] sm:text-sm font-medium text-secondary-900">Ajouter un membre</p>
              </button>
              <button onClick={() => navigate('/cotisations-annuelles')} className="p-2.5 sm:p-4 bg-emerald-50 rounded-xl text-left hover:bg-emerald-100 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 mb-1 sm:mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                <p className="text-[11px] sm:text-sm font-medium text-secondary-900">Cotisation annuelle</p>
              </button>
              <button onClick={() => navigate('/decaissements')} className="p-2.5 sm:p-4 bg-amber-50 rounded-xl text-left hover:bg-amber-100 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 mb-1 sm:mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                <p className="text-[11px] sm:text-sm font-medium text-secondary-900">Décaissement</p>
              </button>
              <button onClick={() => navigate('/rapports')} className="p-2.5 sm:p-4 bg-purple-50 rounded-xl text-left hover:bg-purple-100 transition-colors">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 mb-1 sm:mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <p className="text-[11px] sm:text-sm font-medium text-secondary-900">Rapports</p>
              </button>
            </div>
          </CardBody>
        </Card>

      {recentMembers.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">Derniers membres</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {recentMembers.map(m => (
                <div key={m.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-secondary-50 rounded-xl cursor-pointer hover:bg-secondary-100 transition-colors" onClick={() => navigate(`/members/${m.id}`)}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                    {m.nom.charAt(0)}{m.prenoms.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-secondary-900 truncate">{m.prenoms} {m.nom}</p>
                    <p className="text-[11px] sm:text-xs text-secondary-500 truncate">{m.telephone}</p>
                  </div>
                  <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0 ${m.statut === 'Actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {m.statut}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
