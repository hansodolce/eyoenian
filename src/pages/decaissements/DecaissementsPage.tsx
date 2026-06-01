import { useState } from 'react'
import { Card, CardBody, CardHeader, Button, Modal, Input, Badge, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui'
import { useDisbursements } from '@/services/queries'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency, generateReference } from '@/utils'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function DecaissementsPage() {
  const { data: disbursements, isLoading } = useDisbursements()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null)

  const printInNewWindow = (html: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    w.document.write([
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Decaissements</title>',
      '<style>',
      'body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px;color:#111;max-width:1000px;margin:0 auto}',
      'table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
      'th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}',
      'th{background:#f8f9fa;font-weight:600}',
      '.section-title{font-size:16px;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:6px;margin:24px 0 12px}',
      '.sub{font-size:12px;color:#666;margin:2px 0 0}',
      '.total{font-weight:700;font-size:15px;text-align:right;padding-top:12px;border-top:2px solid #333}',
      '.footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;margin-top:32px}',
      '</style></head><body>',
      '<h1 style="font-size:22px;margin:0 0 4px">Eyo-Enian</h1>',
      '<p style="color:#666;font-size:13px;margin:0 0 24px">Liste des decaissements</p>',
      html,
      '<div class="footer">Genere le ', genDate, '</div>',
      '</body></html>',
    ].join(''))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ reference: generateReference(), date: new Date().toISOString().split('T')[0], responsable: '', observation: '' })
  const [items, setItems] = useState([{ designation: '', montant: 0 }])

  function addItem() { setItems([...items, { designation: '', montant: 0 }]) }
  function removeItem(index: number) { setItems(items.filter((_, i) => i !== index)) }
  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalItems = items.reduce((s, item) => s + Number(item.montant), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0 || items.some(i => !i.designation || i.montant <= 0)) {
      toast.error('Veuillez remplir toutes les lignes')
      return
    }
    setLoading(true)
    try {
      const { data: disb, error } = await supabase.from('disbursements').insert({
        ...form, total_montant: totalItems
      }).select().single()
      if (error) throw error

      const { error: itemsError } = await supabase.from('disbursement_items').insert(
        items.map(item => ({ ...item, disbursement_id: disb.id }))
      )
      if (itemsError) throw itemsError

      toast.success('Décaissement enregistré')
      setShowAddModal(false)
      setForm({ reference: generateReference(), date: new Date().toISOString().split('T')[0], responsable: '', observation: '' })
      setItems([{ designation: '', montant: 0 }])
      queryClient.invalidateQueries({ queryKey: ['disbursements'] })
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Décaissements"
        subtitle={disbursements ? `${disbursements.length} décaissement${disbursements.length > 1 ? 's' : ''}` : ''}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            const rows = (disbursements || []).map(d => `
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #ddd">
                <div style="font-weight:600;font-size:15px">${d.reference}</div>
                <div class="sub">${formatDate(d.date)} — Responsable: ${d.responsable}</div>
                ${d.observation ? `<div class="sub">${d.observation}</div>` : ''}
                <table style="margin-top:8px">
                  <thead><tr><th>Designation</th><th style="text-align:right">Montant</th></tr></thead>
                  <tbody>${(d.items || []).map((i: any) => `<tr><td>${i.designation}</td><td style="text-align:right">${formatCurrency(i.montant)}</td></tr>`).join('')}</tbody>
                </table>
                <div class="total">Total: ${formatCurrency(d.total_montant)}</div>
              </div>
            `).join('')
            printInNewWindow(rows)
          }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">Nouveau décaissement</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-3">
        {(disbursements || []).map(d => (
          <Card key={d.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setShowDetailModal(d.id)}>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <h3 className="font-semibold text-secondary-900 truncate">{d.reference}</h3>
                    <span className="text-xs text-secondary-400">—</span>
                    <span className="text-sm text-secondary-500">{formatDate(d.date)}</span>
                  </div>
                  <p className="text-sm text-secondary-600">Responsable: <strong>{d.responsable}</strong></p>
                  {d.observation && <p className="text-sm text-secondary-400 mt-1 truncate">{d.observation}</p>}
                  <p className="text-xs text-secondary-400 mt-1">{d.items?.length || 0} ligne(s)</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-error">{formatCurrency(d.total_montant)}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
        {(!disbursements || disbursements.length === 0) && (
          <EmptyState
            title="Aucun décaissement"
            description="Enregistrez votre premier décaissement"
            action={<Button onClick={() => setShowAddModal(true)}>Nouveau décaissement</Button>}
          />
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau décaissement" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Référence" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} required />
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <Input label="Responsable" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} required />
          <Input label="Observation" value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} />

          <div className="border border-secondary-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-secondary-700">Lignes de décaissement</h4>
              <Button size="sm" variant="ghost" type="button" onClick={addItem}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
                Ajouter une ligne
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    placeholder="Désignation"
                    value={item.designation}
                    onChange={e => updateItem(i, 'designation', e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Montant"
                    value={item.montant || ''}
                    onChange={e => updateItem(i, 'montant', parseInt(e.target.value) || 0)}
                    className="w-28 sm:w-32 px-3 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3 mt-3 border-t border-secondary-100">
              <span className="text-sm font-semibold text-secondary-700">Total: <span className="text-error">{formatCurrency(totalItems)}</span></span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button type="submit" loading={loading}>Enregistrer le décaissement</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {showDetailModal && (() => {
        const d = (disbursements || []).find(d => d.id === showDetailModal)
        if (!d) return null
        return (
          <Modal open={!!showDetailModal} onClose={() => setShowDetailModal(null)} title={`Décaissement ${d.reference}`}>
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => {
                  const w = window.open('', '_blank')
                  if (!w) return
                  const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  w.document.write([
                    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Decaissement ', d.reference, '</title>',
                    '<style>body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}',
                    'table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
                    'th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}',
                    'th{background:#f8f9fa;font-weight:600}',
                    '.total{font-weight:700;font-size:15px;text-align:right;padding-top:12px;border-top:2px solid #333}',
                    '.footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;margin-top:32px}',
                    '.info{font-size:13px;color:#666;margin:0 0 4px}',
                    '</style></head><body>',
                    '<h1 style="font-size:22px;margin:0 0 4px">Eyo-Enian</h1>',
                    '<p style="color:#666;font-size:13px;margin:0 0 24px">Decaissement</p>',
                    '<div class="info"><strong>Reference:</strong> ', d.reference, '</div>',
                    '<div class="info"><strong>Date:</strong> ', formatDate(d.date), '</div>',
                    '<div class="info"><strong>Responsable:</strong> ', d.responsable, '</div>',
                    d.observation ? '<div class="info"><strong>Observation:</strong> ' + d.observation + '</div>' : '',
                    '<table style="margin-top:16px"><thead><tr><th>Designation</th><th style="text-align:right">Montant</th></tr></thead><tbody>',
                    (d.items || []).map((i: any) => '<tr><td>' + i.designation + '</td><td style="text-align:right">' + formatCurrency(i.montant) + '</td></tr>').join(''),
                    '</tbody></table>',
                    '<div class="total">Total: ', formatCurrency(d.total_montant), '</div>',
                    '<div class="footer">Genere le ', genDate, '</div>',
                    '</body></html>',
                  ].join(''))
                  w.document.close()
                  w.focus()
                  setTimeout(() => w.print(), 300)
                }}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimer
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <span className="text-xs text-secondary-500 block">Date</span>
                  <p className="font-medium text-sm">{formatDate(d.date)}</p>
                </div>
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <span className="text-xs text-secondary-500 block">Responsable</span>
                  <p className="font-medium text-sm">{d.responsable}</p>
                </div>
              </div>
              {d.observation && (
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <span className="text-xs text-secondary-500 block">Observation</span>
                  <p className="text-sm mt-0.5">{d.observation}</p>
                </div>
              )}
              <div className="border-t border-secondary-200 pt-4">
                <h4 className="text-sm font-semibold text-secondary-700 mb-3">Détails</h4>
                <div className="space-y-2">
                  {(d.items || []).map(item => (
                    <div key={item.id} className="flex justify-between py-2 px-3 bg-secondary-50 rounded-lg">
                      <span className="text-sm font-medium text-secondary-700">{item.designation}</span>
                      <span className="text-sm font-semibold text-error">{formatCurrency(item.montant)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-secondary-100">
                  <span className="font-semibold text-secondary-900">Total</span>
                  <span className="font-bold text-error text-lg">{formatCurrency(d.total_montant)}</span>
                </div>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
