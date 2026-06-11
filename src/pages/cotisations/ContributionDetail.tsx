import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Card, CardBody, Button, Modal, Input, Select, Pagination, LoadingSpinner, PageHeader, ConfirmDialog } from '@/components/ui'
import { formatDate, formatCurrency } from '@/utils'
import type { Member, AnnualContribution, SpecialContribution, AnnualPayment, SpecialPayment } from '@/types'

const ITEMS_PER_PAGE = 20

export function ContributionDetail({ type }: { type: 'annual' | 'special' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'paye' | 'partiel' | 'impaye'>('all')
  const [page, setPage] = useState(1)
  const [showPayment, setShowPayment] = useState<{ memberId: string; editPayment?: any } | null>(null)
  const [paymentForm, setPaymentForm] = useState({ montant: 0, date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money' as string, observation: '' })
  const [showPaymentsList, setShowPaymentsList] = useState<string | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<any[]>([])
  const [importColumns, setImportColumns] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: number; details: string[] } | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [importHeaderRow, setImportHeaderRow] = useState(0)
  const importFileRef = useRef<HTMLInputElement>(null)
  const workbookRef = useRef<XLSX.WorkBook | null>(null)

  const contribQueryKey = type === 'annual' ? 'annual-contributions' : 'special-contributions'
  const paymentQueryKey = type === 'annual' ? 'annual-payments' : 'special-payments'
  const contribTable = type === 'annual' ? 'annual_contributions' : 'special_contributions'
  const paymentTable = type === 'annual' ? 'annual_payments' : 'special_payments'

  const { data: contribution } = useQuery({
    queryKey: [contribQueryKey, id],
    queryFn: async () => {
      const { data } = await supabase.from(contribTable).select('*').eq('id', id!).single()
      return data as AnnualContribution | SpecialContribution
    },
    enabled: !!id
  })

  const { data: payments = [] } = useQuery({
    queryKey: [paymentQueryKey, id],
    queryFn: async () => {
      const { data } = await supabase
        .from(paymentTable)
        .select('*, member:members(*)')
        .eq('contribution_id', id!)
      return (data || []) as (AnnualPayment | SpecialPayment)[]
    },
    enabled: !!id
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data } = await supabase.from('members').select('*').order('nom', { ascending: true })
      return (data || []) as Member[]
    }
  })

  const createPayment = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from(paymentTable).insert({
        contribution_id: id!,
        member_id: memberId,
        montant: paymentForm.montant,
        date_paiement: paymentForm.date_paiement,
        mode_paiement: paymentForm.mode_paiement,
        statut: 'Confirmé',
        observation: paymentForm.observation || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [paymentQueryKey] })
      toast.success('Paiement enregistré')
      setShowPayment(null)
      setPaymentForm({ montant: 0, date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', observation: '' })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; montant: number; date_paiement: string; mode_paiement: string; observation?: string }) => {
      const { error } = await supabase.from(paymentTable).update(data).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [paymentQueryKey] })
      toast.success('Paiement modifié')
      setShowPayment(null)
      setPaymentForm({ montant: 0, date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', observation: '' })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from(paymentTable).delete().eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [paymentQueryKey] })
      toast.success('Paiement supprimé')
      setDeletePaymentId(null)
    },
    onError: (err: any) => toast.error(err.message)
  })

  const memberPayments = useMemo(() => {
    const map = new Map<string, (AnnualPayment | SpecialPayment)[]>()
    for (const p of payments) {
      const arr = map.get(p.member_id) || []
      arr.push(p)
      map.set(p.member_id, arr)
    }
    return map
  }, [payments])

  const contribAmount = contribution ? (contribution as any).montant : 0
  const contribTitle = type === 'annual'
    ? `Cotisation ${(contribution as any)?.annee || ''}`
    : (contribution as any)?.titre || ''

  const rows = useMemo(() => {
    if (!members.length) return []
    let list = members.map(m => {
      const mPayments = memberPayments.get(m.id) || []
      const confirmed = mPayments.filter((p: any) => p.statut === 'Confirmé')
      const totalPaid = confirmed.reduce((s: number, p: any) => s + Number(p.montant), 0)
      return { member: m, totalPaid, status: totalPaid >= contribAmount ? 'paye' : (totalPaid > 0 ? 'partiel' : 'impaye') as 'paye' | 'partiel' | 'impaye' }
    })
    if (filter === 'paye') list = list.filter(r => r.status === 'paye')
    if (filter === 'partiel') list = list.filter(r => r.status === 'partiel')
    if (filter === 'impaye') list = list.filter(r => r.status === 'impaye')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => `${r.member.prenoms} ${r.member.nom} ${r.member.telephone}`.toLowerCase().includes(q))
    }
    return list
  }, [members, memberPayments, contribAmount, filter, search])

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE)
  const pagedRows = rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function loadSheet(wb: XLSX.WorkBook, name: string, headerIdx?: number) {
    const ws = wb.Sheets[name]
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' }) as any[][]
    if (rawRows.length === 0) { toast.error(`L'onglet "${name}" est vide`); return }

    const hIdx = headerIdx ?? importHeaderRow
    const hdrRow = rawRows[hIdx]
    if (!hdrRow || hdrRow.every((c: any) => String(c || '').trim() === '')) {
      toast.error(`La ligne ${hIdx + 1} ne contient pas d'en-têtes valides`)
      return
    }

    const cols = hdrRow.map((c: any) => String(c || '').trim())
    const lastNonEmpty = cols.map((c, i) => c ? i : -1).filter(i => i >= 0).pop() ?? cols.length - 1
    const cleanCols = cols.slice(0, lastNonEmpty + 1)

    const json = rawRows.slice(hIdx + 1)
      .filter((row: any[]) => row.some((c: any) => String(c || '').trim() !== ''))
      .map((row: any[]) => {
        const obj: any = {}
        cleanCols.forEach((col, i) => { obj[col] = row[i] !== undefined ? row[i] : '' })
        return obj
      })

    if (json.length === 0) { toast.error(`Aucune donnée après la ligne d'en-tête`); return }
    setImportColumns(cleanCols)
    setImportRows(json)
    setImportHeaderRow(hIdx)
    toast.success(`${json.length} ligne(s) dans "${name}"`)
  }

  if (!contribution) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader title={contribTitle} subtitle={`${formatCurrency(contribAmount)} par membre`}>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => {
            const trs = rows.map(({ member, totalPaid, status }) => {
              const reste = status !== 'paye' ? contribAmount - totalPaid : 0
              return `<tr><td>${member.prenoms} ${member.nom}</td><td>${member.telephone}</td><td style="text-align:right">${formatCurrency(totalPaid)}</td><td style="text-align:center">${status === 'paye' ? 'Paye' : status === 'partiel' ? 'Partiel' : 'Impaye'}</td>${status === 'partiel' ? `<td style="text-align:right;color:#d97706">${formatCurrency(reste)}</td>` : '<td></td>'}</tr>`
            }).join('')
            const w = window.open('', '_blank')
            if (!w) return
            const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            w.document.write([
              '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>', contribTitle, '</title>',
              '<style>body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px;color:#111;max-width:1000px;margin:0 auto}',
              'table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
              'th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}',
              'th{background:#f8f9fa;font-weight:600}',
              '.footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;margin-top:32px}',
              '</style></head><body>',
              '<h1 style="font-size:22px;margin:0 0 4px">Eyo-Enian</h1>',
              '<p style="color:#666;font-size:13px;margin:0 0 8px">', contribTitle, '</p>',
              '<p style="color:#666;font-size:13px;margin:0 0 24px">', formatCurrency(contribAmount), ' par membre — ',
              rows.filter(r => r.status === 'paye').length, '/', members.length, ' membres ont paye</p>',
              '<table><thead><tr><th>Membre</th><th>Telephone</th><th style="text-align:right">Montant</th><th style="text-align:center">Statut</th><th style="text-align:right">Reste</th></tr></thead><tbody>',
              trs, '</tbody></table>',
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
          <Button variant="secondary" onClick={() => {
            setImportRows([])
            setImportColumns([])
            setImportResult(null)
            setShowImport(true)
          }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            Importer
          </Button>
          <Button variant="secondary" onClick={() => navigate(type === 'annual' ? '/cotisations-annuelles' : '/cotisations-exceptionnelles')}>
            Retour
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <p className="text-xs text-secondary-500 uppercase tracking-wider">Total membres</p>
            <p className="text-xl font-bold text-secondary-900">{members.length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-secondary-500 uppercase tracking-wider">Ont payé</p>
            <p className="text-xl font-bold text-emerald-600">{rows.filter(r => r.status === 'paye').length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-secondary-500 uppercase tracking-wider">Partiel</p>
            <p className="text-xl font-bold text-amber-600">{rows.filter(r => r.status === 'partiel').length}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-secondary-500 uppercase tracking-wider">Impayés</p>
            <p className="text-xl font-bold text-red-600">{rows.filter(r => r.status === 'impaye').length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un membre..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'paye', 'partiel', 'impaye'] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} onClick={() => { setFilter(f); setPage(1) }}>
                  {f === 'all' ? 'Tous' : f === 'paye' ? 'Paye' : f === 'partiel' ? 'Partiel' : 'Impaye'}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200">
                  <th className="text-left py-3 px-2 font-medium text-secondary-600">Membre</th>
                  <th className="text-left py-3 px-2 font-medium text-secondary-600 hidden sm:table-cell">Téléphone</th>
                  <th className="text-center py-3 px-2 font-medium text-secondary-600">Montant</th>
                  <th className="text-center py-3 px-2 font-medium text-secondary-600">Statut</th>
                  <th className="text-right py-3 px-2 font-medium text-secondary-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map(({ member, totalPaid, status }) => (
                  <tr key={member.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                    <td className="py-3 px-2">
                      <p className="font-medium text-secondary-900">{member.prenoms} {member.nom}</p>
                    </td>
                    <td className="py-3 px-2 text-secondary-500 hidden sm:table-cell">{member.telephone}</td>
                    <td className="py-3 px-2 text-center text-secondary-700">{formatCurrency(totalPaid)}</td>
                    <td className="py-3 px-2 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          status === 'paye' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'partiel' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status === 'paye' ? 'Payé' : status === 'partiel' ? 'Partiel' : 'Impayé'}
                        </span>
                        {status === 'partiel' && (
                          <span className="text-[11px] text-amber-600 font-medium">
                            Reste: {formatCurrency(contribAmount - totalPaid)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {status !== 'paye' && (
                          <Button size="sm" variant="success" onClick={() => { setShowPayment({ memberId: member.id }); setPaymentForm(f => ({ ...f, montant: contribAmount - totalPaid })) }}>
                            Payer
                          </Button>
                        )}
                        {totalPaid > 0 && (
                          <Button size="sm" variant="secondary" onClick={() => setShowPaymentsList(member.id)}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="hidden sm:inline ml-1">{status === 'paye' ? 'Modifier' : 'Paiements'}</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination current={page} total={rows.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
            </div>
          )}

          {rows.length === 0 && (
            <div className="text-center py-8 text-secondary-500">
              Aucun membre trouvé
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={!!showPayment} onClose={() => { setShowPayment(null); setPaymentForm({ montant: 0, date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', observation: '' }) }} title={showPayment?.editPayment ? 'Modifier le paiement' : 'Enregistrer un paiement'}>
        <form onSubmit={e => {
          e.preventDefault()
          if (!showPayment) return
          if (showPayment.editPayment) {
            updatePayment.mutate({ id: showPayment.editPayment.id, ...paymentForm, observation: paymentForm.observation || undefined })
          } else {
            createPayment.mutate(showPayment.memberId)
          }
        }} className="space-y-4">
          <Input label="Montant (FCFA)" type="number" value={paymentForm.montant} onChange={e => setPaymentForm(f => ({ ...f, montant: parseInt(e.target.value) || 0 }))} required />
          <Input label="Date" type="date" value={paymentForm.date_paiement} onChange={e => setPaymentForm(f => ({ ...f, date_paiement: e.target.value }))} required />
          <Select label="Mode de paiement" value={paymentForm.mode_paiement} onChange={e => setPaymentForm(f => ({ ...f, mode_paiement: e.target.value }))}
            options={[{ value: 'Espèces', label: 'Espèces' }, { value: 'Mobile Money', label: 'Mobile Money' }, { value: 'Autres', label: 'Autres' }]} required
          />
          <Input label="Observation" value={paymentForm.observation} onChange={e => setPaymentForm(f => ({ ...f, observation: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowPayment(null); setPaymentForm({ montant: 0, date_paiement: new Date().toISOString().split('T')[0], mode_paiement: 'Mobile Money', observation: '' }) }}>Annuler</Button>
            <Button type="submit" loading={createPayment.isPending || updatePayment.isPending}>{showPayment?.editPayment ? 'Modifier' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title={`Importer des paiements${contribTitle ? ' - ' + contribTitle : ''}`} className="max-w-2xl">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-secondary-300 rounded-xl p-6 text-center">
            <p className="text-sm text-secondary-600 mb-2">Fichier Excel avec colonnes : nom, prénoms, téléphone, montant, date, mode_paiement</p>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              const reader = new FileReader()
              reader.onload = (evt) => {
                const buf = new Uint8Array(evt.target?.result as ArrayBuffer)
                const wb = XLSX.read(buf, { type: 'array' })
                workbookRef.current = wb
                setSheetNames(wb.SheetNames)
                setSelectedSheet(wb.SheetNames[0])
                setImportHeaderRow(0)
                loadSheet(wb, wb.SheetNames[0], 0)
                setImportResult(null)
              }
              reader.readAsArrayBuffer(f)
            }} className="hidden" />
            <Button variant="secondary" onClick={() => importFileRef.current?.click()}>Sélectionner un fichier</Button>
            {sheetNames.length > 1 && (
              <select value={selectedSheet} onChange={e => {
                setSelectedSheet(e.target.value)
                if (workbookRef.current) loadSheet(workbookRef.current, e.target.value, 0)
              }} className="mt-2 px-3 py-1.5 rounded border border-secondary-300 text-sm w-full">
                {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {importRows.length > 0 && (
              <div className="mt-2 flex items-center gap-2 justify-center">
                <span className="text-xs text-secondary-500">Ligne d'en-tête:</span>
                <button onClick={() => { const h = Math.max(0, importHeaderRow - 1); if (workbookRef.current) loadSheet(workbookRef.current, selectedSheet, h) }}
                  className="px-2 py-1 rounded border border-secondary-300 text-xs hover:bg-secondary-50"
                  disabled={importHeaderRow <= 0}
                >−</button>
                <span className="text-xs font-medium w-6 text-center">{importHeaderRow + 1}</span>
                <button onClick={() => { if (workbookRef.current) loadSheet(workbookRef.current, selectedSheet, importHeaderRow + 1) }}
                  className="px-2 py-1 rounded border border-secondary-300 text-xs hover:bg-secondary-50"
                >+</button>
              </div>
            )}
          </div>

          {importRows.length > 0 && !importResult && (
            <div className="space-y-3">
              <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-secondary-50">
                    {importColumns.map(c => <th key={c} className="px-2 py-1.5 text-left font-medium text-secondary-600 whitespace-nowrap">{c}</th>)}
                  </tr></thead>
                  <tbody>
                    {importRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-secondary-100">
                        {importColumns.map(c => <td key={c} className="px-2 py-1.5 text-secondary-600 truncate max-w-[120px]">{String((row as any)[c] || '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={async () => {
                setImporting(true)
                let created = 0, skipped = 0, errors = 0
                const details: string[] = []

                try {
                  const memberMap = new Map<string, string>()
                  const memberNames = new Map<string, string>()
                  for (const m of members) {
                    if (m.telephone && m.telephone !== 'NEANT') memberMap.set(m.telephone.replace(/[\s\-\.\/\(\)]/g, ''), m.id)
                    memberMap.set(`${m.nom.toLowerCase().trim()}|${(m.prenoms || '').toLowerCase().trim()}`, m.id)
                    memberNames.set(m.id, `${m.nom} ${m.prenoms || ''}`)
                  }

                  const existingPayments = new Set(payments.map((p: any) => p.member_id))

                  // Find best matching column for each field from the Excel headers
                  const cols = importColumns.map(c => c.toLowerCase().trim())
                  const findCol = (aliases: string[]): string | undefined => {
                    for (const a of aliases) { const idx = cols.indexOf(a); if (idx >= 0) return importColumns[idx] }
                    for (const a of aliases) { const idx = cols.findIndex(c => c.includes(a) || a.includes(c)); if (idx >= 0) return importColumns[idx] }
                    return undefined
                  }

                  const nomAliases = ['nom', 'noms', 'name', 'membre', 'lastname', 'member']
                  const prenomsAliases = ['prenoms', 'prénoms', 'prenom', 'prénom', 'firstname', 'prenom(s)', 'given name']
                  const phoneAliases = ['telephone', 'téléphone', 'tel', 'phone', 'mobile', 'contact', 'portable', 'whatsapp', 'tél']
                  const montantAliases = ['montant', 'montant paye', 'montant_paye', 'montant payé', 'paye', 'payé', 'amount', 'somme', 'prix', 'total', 'valeur', 'value']
                  const dateAliases = ['date', 'date_paiement', 'date paiement', 'payment date', 'payé le']
                  const modeAliases = ['mode_paiement', 'mode paiement', 'mode', 'moyen', 'moyen paiement', 'payment method']

                  const nomCol = findCol(nomAliases)
                  const prenomsCol = findCol(prenomsAliases)
                  const phoneCol = findCol(phoneAliases)
                  let montantCol = findCol(montantAliases)
                  const dateCol = findCol(dateAliases)
                  const modeCol = findCol(modeAliases)

                  // If no montant column found by name, try to find any column with numeric values
                  if (!montantCol && importRows.length > 0) {
                    const firstRow = importRows[0] as any
                    for (const c of importColumns) {
                      const val = String(firstRow[c] || '').replace(/[^0-9]/g, '')
                      if (val.length > 0 && parseInt(val) > 0) { montantCol = c; break }
                    }
                  }

                  for (let i = 0; i < importRows.length; i++) {
                    const row = importRows[i] as any
                    const nom = nomCol ? String(row[nomCol] || '').trim() : ''
                    const prenoms = prenomsCol ? String(row[prenomsCol] || '').trim() : ''
                    const rawPhone = phoneCol ? String(row[phoneCol] || '').trim() : ''
                    const phone = rawPhone.replace(/[\s\-\.\/]/g, '')
                    const montant = montantCol ? parseInt(String(row[montantCol] || '0').replace(/[^0-9]/g, '')) || 0 : 0
                    const date = dateCol ? String(row[dateCol] || '').trim() || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                    const mode = modeCol ? String(row[modeCol] || '').trim() : ''

                    let memberId = phone ? memberMap.get(phone) : undefined
                    if (!memberId) memberId = memberMap.get(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`)
                    if (!memberId) {
                      for (const key of memberMap.keys()) {
                        if (key.includes(nom.toLowerCase()) && key.includes(prenoms.toLowerCase())) {
                          memberId = memberMap.get(key)
                          break
                        }
                      }
                    }
                    if (!memberId) { errors++; details.push(`L${i + 1}: Membre "${nom} ${prenoms}" introuvable`); continue }
                    if (existingPayments.has(memberId)) { skipped++; details.push(`L${i + 1}: ${memberNames.get(memberId)} a déjà payé`); continue }
                    if (montant <= 0) { errors++; details.push(`L${i + 1}: Montant invalide pour ${nom} ${prenoms}`); continue }

                    const { error } = await supabase.from(paymentTable).insert({
                      contribution_id: id!, member_id: memberId, montant,
                      date_paiement: date, mode_paiement: ['Espèces', 'Mobile Money', 'Autres'].includes(mode) ? mode : 'Mobile Money',
                      statut: 'Confirmé'
                    })
                    if (error) { errors++; details.push(`L${i + 1}: Erreur ${nom} ${prenoms}: ${error.message}`) }
                    else { created++; details.push(`L${i + 1}: ${nom} ${prenoms} - ${formatCurrency(montant)}`) }
                  }
                } catch (e: any) {
                  details.push(`Erreur inattendue: ${e?.message || e}`)
                  errors++
                }

                setImportResult({ created, skipped, errors, details })
                queryClient.invalidateQueries({ queryKey: [paymentQueryKey] })
                setImporting(false)
                toast.success(`${created} paiement(s) importé(s)`)
              }} loading={importing} disabled={importing}>
                {importing ? 'Importation...' : `Importer ${importRows.length} ligne(s)`}
              </Button>
              <p className="text-[10px] text-secondary-400 text-center">
                Colonnes: {importColumns.join(', ')}
              </p>
            </div>
          )}

          {importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-emerald-700">{importResult.created}</p>
                  <p className="text-xs text-emerald-600">Importés</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-amber-700">{importResult.skipped}</p>
                  <p className="text-xs text-amber-600">Déjà payés</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-700">{importResult.errors}</p>
                  <p className="text-xs text-red-600">Erreurs</p>
                </div>
              </div>
              {importResult.details.length > 0 && (
                <div className="max-h-48 overflow-y-auto bg-secondary-50 rounded-lg p-3 text-xs text-secondary-600 font-mono">
                  {importResult.details.map((d, i) => <div key={i}>{d}</div>)}
                </div>
              )}
              <Button variant="secondary" onClick={() => { setShowImport(false); setImportRows([]); setImportResult(null) }}>Fermer</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Member Payments List Modal */}
      <Modal open={!!showPaymentsList} onClose={() => setShowPaymentsList(null)} title="Paiements du membre" className="max-w-lg">
        {showPaymentsList && (() => {
          const member = members.find(m => m.id === showPaymentsList)
          const mPayments = (memberPayments.get(showPaymentsList) || []).filter((p: any) => p.statut === 'Confirmé')
          return (
            <div className="space-y-3">
              <p className="text-sm font-medium text-secondary-900">{member?.prenoms} {member?.nom} — {member?.telephone}</p>
              {mPayments.length === 0 ? (
                <p className="text-sm text-secondary-500">Aucun paiement</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {mPayments.map((p: any) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-secondary-900">{formatCurrency(p.montant)}</span>
                          <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">{p.mode_paiement}</span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-0.5">{formatDate(p.date_paiement)}</p>
                        {p.observation && <p className="text-xs text-secondary-400 mt-0.5">{p.observation}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => {
                          setShowPaymentsList(null)
                          setShowPayment({ memberId: showPaymentsList, editPayment: p })
                          setPaymentForm({ montant: p.montant, date_paiement: p.date_paiement?.split('T')[0] || p.date_paiement, mode_paiement: p.mode_paiement, observation: p.observation || '' })
                        }} className="p-1.5 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Modifier">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeletePaymentId(p.id)} className="p-1.5 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setShowPaymentsList(null)}>Fermer</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        open={!!deletePaymentId}
        title="Supprimer le paiement"
        message="Êtes-vous sûr de vouloir supprimer ce paiement ? Cette action est irréversible."
        onConfirm={() => deletePaymentId && deletePayment.mutate(deletePaymentId)}
        onCancel={() => setDeletePaymentId(null)}
        loading={deletePayment.isPending}
      />
    </div>
  )
}
