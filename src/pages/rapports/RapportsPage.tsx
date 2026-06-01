import { useState } from 'react'
import { Card, CardBody, CardHeader, Button, Modal, LoadingSpinner, PageHeader } from '@/components/ui'
import { useDashboardStats, useMembers, useAnnualContributions, useAnnualPayments, useSpecialContributions, useSpecialPayments, useDisbursements } from '@/services/queries'
import { formatCurrency, formatDate } from '@/utils'
import jsPDF from 'jspdf'
import jspdfAutotable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function RapportsPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const { data: members } = useMembers()
  const { data: annualC } = useAnnualContributions()
  const { data: annualP } = useAnnualPayments()
  const { data: specialC } = useSpecialContributions()
  const { data: specialP } = useSpecialPayments()
  const { data: disbursements } = useDisbursements()
  const [preview, setPreview] = useState<{ title: string; content: React.ReactNode } | null>(null)

  if (isLoading) return <LoadingSpinner />

  function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(18)
    doc.text('Eyo-Enian', 14, 20)
    doc.setFontSize(11)
    doc.text(title, 14, 28)
    doc.setFontSize(8)
    const genDate = new Date().toLocaleDateString('fr-FR')
    doc.text('Genere le ' + genDate, 14, 34)
    jspdfAutotable(doc, { head: [headers], body: rows, startY: 40, styles: { fontSize: 7 }, headStyles: { fillColor: [15, 23, 42] } })
    doc.save(title.toLowerCase().replace(/\s+/g, '_') + '.pdf')
  }

  function exportExcel(title: string, rows: Record<string, any>[]) {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport')
    XLSX.writeFile(wb, title.toLowerCase().replace(/\s+/g, '_') + '.xlsx')
  }

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  const printInNewWindow = (title: string, html: string) => {
    const w = window.open('', '_blank')
    if (!w) return
    const genDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    w.document.write([
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>', title, '</title>',
      '<style>',
      'body{font-family:"Segoe UI",system-ui,sans-serif;padding:40px;color:#111;max-width:1000px;margin:0 auto}',
      'table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}',
      'th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}',
      'th{background:#f8f9fa;font-weight:600}',
      '.section-title{font-size:16px;font-weight:700;border-bottom:1px solid #ccc;padding-bottom:6px;margin:24px 0 12px}',
      '.footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:16px;margin-top:32px}',
      '</style></head><body>',
      '<h1 style="font-size:22px;margin:0 0 4px">Eyo-Enian</h1>',
      '<p style="color:#666;font-size:13px;margin:0 0 24px">', title, '</p>',
      html,
      '<div class="footer">Genere le ', genDate, '</div>',
      '</body></html>',
    ].join(''))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const rapportCards = [
    {
      title: 'Rapport financier',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'emerald' as const,
      items: [
        { label: 'Recettes', value: formatCurrency(stats?.recettes || 0) },
        { label: 'Depenses', value: formatCurrency(stats?.depenses || 0) },
        { label: 'Solde', value: formatCurrency(stats?.solde || 0) },
      ],
      printHTML: () => {
        const r = formatCurrency(stats?.recettes || 0)
        const d = formatCurrency(stats?.depenses || 0)
        const s = formatCurrency(stats?.solde || 0)
        const n1 = annualP?.filter(p => p.statut === "Confirm\u00e9").length || 0
        const n2 = specialP?.filter(p => p.statut === "Confirm\u00e9").length || 0
        const n3 = disbursements?.length || 0
        return [
          '<div class="section-title">Recapitulatif</div>',
          '<table><tr><td style="font-weight:500">Recettes</td><td>', r, '</td></tr>',
          '<tr><td style="font-weight:500">Depenses</td><td>', d, '</td></tr>',
          '<tr><td style="font-weight:500">Solde</td><td style="font-weight:700">', s, '</td></tr></table>',
          '<div>Cotisations annuelles confirmees : ', String(n1), '</div>',
          '<div>Cotisations exceptionnelles confirmees : ', String(n2), '</div>',
          '<div>Decaissements : ', String(n3), '</div>',
        ].join('')
      },
      onPDF: () => exportPDF('Rapport_financier', ['Indicateur', 'Valeur'],
        [['Recettes', formatCurrency(stats?.recettes || 0)], ['Depenses', formatCurrency(stats?.depenses || 0)], ['Solde', formatCurrency(stats?.solde || 0)]]
      ),
      onExcel: () => exportExcel('Rapport_financier',
        [{ Indicateur: 'Recettes', Valeur: stats?.recettes || 0 }, { Indicateur: 'Depenses', Valeur: stats?.depenses || 0 }, { Indicateur: 'Solde', Valeur: stats?.solde || 0 }]
      ),
    },
    {
      title: 'Liste des membres',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      color: 'blue' as const,
      items: [
        { label: 'Total', value: String(members?.length || 0) },
        { label: 'Actifs', value: String(members?.filter(m => m.statut === 'Actif').length || 0) },
        { label: 'Inactifs', value: String(members?.filter(m => m.statut === 'Inactif').length || 0) },
      ],
      printHTML: () => {
        const rows = (members || []).map((m, i) => {
          const cells = [String(i + 1), m.nom, m.prenoms, m.telephone, m.sexe, m.fonction || '-', m.statut, formatDate(m.date_adhesion)]
          return '<tr><td>' + cells.join('</td><td>') + '</td></tr>'
        }).join('')
        const headers = ['No', 'Nom', 'Prenoms', 'Telephone', 'Sexe', 'Fonction', 'Statut', 'Adhesion']
        return '<table><thead><tr><th>' + headers.join('</th><th>') + '</th></tr></thead><tbody>' + rows + '</tbody></table>'
      },
      onPDF: () => exportPDF('Liste_des_membres', ['No', 'Nom', 'Prenoms', 'Telephone', 'Sexe', 'Fonction', 'Statut', 'Adhesion'],
        (members || []).map((m, i) => [String(i + 1), m.nom, m.prenoms, m.telephone, m.sexe, m.fonction || '-', m.statut, formatDate(m.date_adhesion)])
      ),
      onExcel: () => exportExcel('Liste_des_membres',
        (members || []).map((m, i) => ({ No: i + 1, Nom: m.nom, Prenoms: m.prenoms, Telephone: m.telephone, Sexe: m.sexe, Fonction: m.fonction || '-', Statut: m.statut, Date_adhesion: formatDate(m.date_adhesion) }))
      ),
    },
    {
      title: 'Rapport cotisations',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'purple' as const,
      items: [
        { label: 'Cotisations annuelles', value: String(annualC?.length || 0) },
        { label: 'Paiements annuels', value: String(annualP?.length || 0) },
        { label: 'Cotisations exceptionnelles', value: String(specialC?.length || 0) },
        { label: 'Paiements speciaux', value: String(specialP?.length || 0) },
        { label: 'Decaissements', value: String(disbursements?.length || 0) },
      ],
      printHTML: () => {
        const annRows = (annualC || []).map(c => {
          const p = (annualP || []).filter(pp => pp.contribution_id === c.id && pp.statut === "Confirm\u00e9")
          const paid = formatCurrency(p.reduce((s, x) => s + Number(x.montant), 0))
          return '<tr><td>' + c.annee + '</td><td>' + formatCurrency(c.montant) + '</td><td>' + paid + '</td></tr>'
        }).join('')
        const specRows = (specialC || []).map(c => {
          return '<tr><td>' + (c.titre || '') + '</td><td>' + (c.type || '') + '</td><td>' + formatCurrency(c.montant) + '</td></tr>'
        }).join('')
        const disbRows = (disbursements || []).map(d => {
          return '<tr><td>' + (d.reference || '') + '</td><td>' + formatDate(d.date) + '</td><td>' + formatCurrency(d.total_montant) + '</td></tr>'
        }).join('')
        return [
          '<div class="section-title">Cotisations annuelles</div>',
          '<table><thead><tr><th>Annee</th><th>Montant</th><th>Paye</th></tr></thead><tbody>', annRows, '</tbody></table>',
          '<div class="section-title">Cotisations exceptionnelles</div>',
          '<table><thead><tr><th>Titre</th><th>Type</th><th>Montant</th></tr></thead><tbody>', specRows, '</tbody></table>',
          '<div class="section-title">Decaissements</div>',
          '<table><thead><tr><th>Ref.</th><th>Date</th><th>Montant</th></tr></thead><tbody>', disbRows, '</tbody></table>',
        ].join('')
      },
      onPDF: () => exportPDF('Rapport_cotisations', ['Type', 'Nombre'],
        [['Cotisations annuelles', String(annualC?.length || 0)], ['Paiements annuels', String(annualP?.length || 0)], ['Cotisations exceptionnelles', String(specialC?.length || 0)], ['Paiements speciaux', String(specialP?.length || 0)], ['Decaissements', String(disbursements?.length || 0)]]
      ),
      onExcel: () => exportExcel('Rapport_cotisations',
        [{ Type: 'Cotisations annuelles', Nombre: annualC?.length || 0 }, { Type: 'Paiements annuels', Nombre: annualP?.length || 0 }, { Type: 'Cotisations exceptionnelles', Nombre: specialC?.length || 0 }, { Type: 'Paiements speciaux', Nombre: specialP?.length || 0 }, { Type: 'Decaissements', Nombre: disbursements?.length || 0 }]
      ),
    },
  ]

  const getPreview = (idx: number) => {
    const card = rapportCards[idx]
    if (card.title === 'Liste des membres') {
      return (
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white"><tr className="border-b bg-gray-50">
              <th className="py-2 px-2 text-left font-medium">No</th>
              <th className="py-2 px-2 text-left font-medium">Nom</th>
              <th className="py-2 px-2 text-left font-medium">Prenoms</th>
              <th className="py-2 px-2 text-left font-medium">Tel.</th>
              <th className="py-2 px-2 text-center font-medium">Statut</th>
            </tr></thead>
            <tbody>
              {(members || []).map((m, i) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-2 font-medium">{m.nom}</td>
                  <td className="py-2 px-2">{m.prenoms}</td>
                  <td className="py-2 px-2 text-gray-500">{m.telephone}</td>
                  <td className="py-2 px-2 text-center"><span className={'inline-block px-2 py-0.5 rounded text-xs font-medium ' + (m.statut === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{m.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    if (card.title === 'Rapport cotisations') {
      return (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Cotisations annuelles</h4>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="py-2 px-2 text-left font-medium">Annee</th><th className="py-2 px-2 text-right font-medium">Montant</th><th className="py-2 px-2 text-right font-medium">Paye</th></tr></thead>
              <tbody>{(annualC || []).map(c => {
                const p = (annualP || []).filter(pp => pp.contribution_id === c.id && pp.statut === 'Confirm\u00e9')
                return <tr key={c.id} className="border-b border-gray-100"><td className="py-2 px-2">{c.annee}</td><td className="py-2 px-2 text-right">{formatCurrency(c.montant)}</td><td className="py-2 px-2 text-right">{formatCurrency(p.reduce((s, x) => s + Number(x.montant), 0))}</td></tr>
              })}</tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Cotisations exceptionnelles</h4>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="py-2 px-2 text-left font-medium">Titre</th><th className="py-2 px-2 text-left font-medium">Type</th><th className="py-2 px-2 text-right font-medium">Montant</th></tr></thead>
              <tbody>{(specialC || []).map(c => (
                <tr key={c.id} className="border-b border-gray-100"><td className="py-2 px-2">{c.titre}</td><td className="py-2 px-2 text-gray-500">{c.type}</td><td className="py-2 px-2 text-right">{formatCurrency(c.montant)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Decaissements</h4>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="py-2 px-2 text-left font-medium">Ref.</th><th className="py-2 px-2 text-left font-medium">Date</th><th className="py-2 px-2 text-right font-medium">Montant</th></tr></thead>
              <tbody>{(disbursements || []).map(d => (
                <tr key={d.id} className="border-b border-gray-100"><td className="py-2 px-2 font-medium">{d.reference}</td><td className="py-2 px-2 text-gray-500">{formatDate(d.date)}</td><td className="py-2 px-2 text-right">{formatCurrency(d.total_montant)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )
    }
    return (
      <div className="divide-y divide-secondary-100">
        {card.items.map((item, j) => (
          <div key={j} className="flex justify-between py-3">
            <span className="text-sm text-secondary-600">{item.label}</span>
            <span className="text-sm font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Rapports" subtitle="Generez des rapports PDF et Excel" />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {rapportCards.map((card, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={'w-10 h-10 rounded-lg flex items-center justify-center ' + (colorMap[card.color] || 'bg-gray-100 text-gray-600')}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={card.icon} /></svg>
                </div>
                <h3 className="font-semibold text-secondary-900">{card.title}</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2 mb-6">
                {card.items.map((item, j) => (
                  <div key={j} className="flex justify-between py-2 border-b border-secondary-100 last:border-0">
                    <span className="text-sm text-secondary-600">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPreview({ title: card.title, content: getPreview(i) })}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Apercu
                </Button>
                <Button size="sm" variant="secondary" onClick={card.onPDF}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  PDF
                </Button>
                <Button size="sm" variant="secondary" onClick={card.onExcel}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Excel
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''} className="max-w-4xl">
        {preview?.content}
        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 mt-4">
          <Button variant="secondary" onClick={() => setPreview(null)}>Fermer</Button>
          <Button onClick={() => {
            const idx = rapportCards.findIndex(c => c.title === preview?.title)
            if (idx >= 0) {
              const html = rapportCards[idx].printHTML()
              setPreview(null)
              setTimeout(() => printInNewWindow(rapportCards[idx].title, html), 200)
            }
          }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
