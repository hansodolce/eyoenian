import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Button, Modal, Input, Badge, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui'
import { useAnnualContributions, useAnnualPayments, useMembers, useCreateContribution } from '@/services/queries'
import { formatDate, formatCurrency } from '@/utils'
import toast from 'react-hot-toast'

export function CotisationsAnnuellesPage() {
  const navigate = useNavigate()
  const { data: contributions, isLoading } = useAnnualContributions()
  const { data: payments } = useAnnualPayments()
  const { data: members } = useMembers()
  const createContribution = useCreateContribution('annual')

  const [showAddModal, setShowAddModal] = useState(false)
  const activeMembers = (members || []).filter(m => m.statut === 'Actif')

  const printInNewWindow = (html: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    w.document.write([
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Cotisations annuelles</title>',
      '<style>',
      'body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px;color:#111;max-width:1000px;margin:0 auto}',
      'table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
      'th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}',
      'th{background:#f8f9fa;font-weight:600}',
      '.section-title{font-size:16px;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:6px;margin:24px 0 12px}',
      '.footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;margin-top:32px}',
      '</style></head><body>',
      '<h1 style="font-size:22px;margin:0 0 4px">Eyo-Enian</h1>',
      '<p style="color:#666;font-size:13px;margin:0 0 24px">Cotisations annuelles</p>',
      html,
      '<div class="footer">Genere le ', genDate, '</div>',
      '</body></html>',
    ].join(''))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }
  const [form, setForm] = useState({ annee: new Date().getFullYear(), montant: 0, description: '', date_limite: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createContribution.mutateAsync(form)
      toast.success('Cotisation créée avec succès')
      setShowAddModal(false)
      setForm({ annee: new Date().getFullYear(), montant: 0, description: '', date_limite: '' })
    } catch (err: any) { toast.error(err.message) }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Cotisations Annuelles" subtitle="Gérez les cotisations annuelles des membres">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            const rows = (contributions || []).map(c => {
              const cp = (payments || []).filter(p => p.contribution_id === c.id && p.statut === 'Confirmé')
              const byMember = new Map<string, number>()
              for (const p of cp) byMember.set(p.member_id, (byMember.get(p.member_id) || 0) + Number(p.montant))
              const paid = [...byMember.values()].filter(t => t >= c.montant).length
              const total = cp.reduce((s, p) => s + Number(p.montant), 0)
              return `<tr><td>${c.annee}</td><td>${formatCurrency(c.montant)}</td><td>${paid}/${activeMembers.length}</td><td>${formatCurrency(total)} / ${formatCurrency(c.montant * activeMembers.length)}</td><td>${c.date_limite ? formatDate(c.date_limite) : '-'}</td></tr>`
            }).join('')
            printInNewWindow('<table><thead><tr><th>Annee</th><th>Montant</th><th>Membres</th><th>Total</th><th>Limite</th></tr></thead><tbody>' + rows + '</tbody></table>')
          }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">Nouvelle cotisation</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4">
        {(contributions || []).map(contrib => {
          const contribPayments = (payments || []).filter(p => p.contribution_id === contrib.id)
          const confirmedPayments = contribPayments.filter(p => p.statut === 'Confirmé')
          const totalPaid = confirmedPayments.reduce((s, p) => s + Number(p.montant), 0)
          const paidByMember = new Map<string, number>()
          for (const p of confirmedPayments) {
            paidByMember.set(p.member_id, (paidByMember.get(p.member_id) || 0) + Number(p.montant))
          }
          const paidCount = [...paidByMember.values()].filter(total => total >= contrib.montant).length
          const expectedTotal = contrib.montant * activeMembers.length
          const progressPercent = expectedTotal > 0 ? Math.min(100, (totalPaid / expectedTotal) * 100) : 0
          const status: 'success' | 'warning' | 'error' = paidCount === 0 ? 'error' : progressPercent >= 100 ? 'success' : 'warning'

          return (
            <Card key={contrib.id}>
              <button className="w-full text-left" onClick={() => navigate(`/cotisations-annuelles/${contrib.id}`)}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-secondary-900">Cotisation {contrib.annee}</h3>
                        <Badge variant={status}>{status === 'success' ? 'Payé' : status === 'warning' ? 'Partiel' : 'Non payé'}</Badge>
                      </div>
                      <p className="text-sm text-secondary-500">{contrib.description || 'Aucune description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">{formatCurrency(contrib.montant)}</p>
                      <p className="text-xs text-secondary-500">par membre / an</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                    <span className="text-secondary-600"><strong>{paidCount}</strong>/{activeMembers.length} membres</span>
                    <span className="text-secondary-600">Total: <strong>{formatCurrency(totalPaid)}</strong> / {formatCurrency(expectedTotal)}</span>
                    {contrib.date_limite && <span className="text-secondary-500">Limite: {formatDate(contrib.date_limite)}</span>}
                  </div>

                  <div className="w-full bg-secondary-100 rounded-full h-2.5 mb-4">
                    <div className={`h-2.5 rounded-full transition-all duration-500 ${
                      status === 'success' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                    }`} style={{ width: `${progressPercent}%` }} />
                  </div>
                </CardBody>
              </button>
            </Card>
          )
        })}
        {(!contributions || contributions.length === 0) && (
          <EmptyState title="Aucune cotisation annuelle" description="Créez votre première cotisation annuelle"
            action={<Button onClick={() => setShowAddModal(true)}>Créer une cotisation</Button>}
          />
        )}
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Nouvelle cotisation annuelle">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Année" type="number" value={form.annee} onChange={e => setForm({ ...form, annee: parseInt(e.target.value) })} required />
          <Input label="Montant (FCFA)" type="number" value={form.montant} onChange={e => setForm({ ...form, montant: parseInt(e.target.value) })} required />
          <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Input label="Date limite" type="date" value={form.date_limite} onChange={e => setForm({ ...form, date_limite: e.target.value })} />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button type="submit" loading={createContribution.isPending}>Créer la cotisation</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
