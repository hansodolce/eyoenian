import { useState, useRef, useMemo } from 'react'
import { Card, CardBody, CardHeader, Button, Badge, LoadingSpinner, Select } from '@/components/ui'
import { formatCurrency } from '@/utils'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface ColumnMatch {
  fileCol: string
  targetField: string
  confidence: number
}

interface DuplicateInfo {
  rowIndex: number
  existingId: string | null
  matchField: string
  matchValue: string
}

interface ImportReport {
  total: number
  members: { created: number; updated: number; skipped: number; errors: number }
  annualContribs: { created: number; updated: number; skipped: number; errors: number }
  specialContribs: { created: number; updated: number; skipped: number; errors: number }
  payments: { created: number; updated: number; skipped: number; errors: number }
  attendances: { created: number; updated: number; skipped: number; errors: number }
  disbursements: { created: number; updated: number; skipped: number; errors: number }
  details: string[]
}

type DataType = 'members' | 'annual_contributions' | 'special_contributions' | 'payments' | 'attendances' | 'disbursements' | 'mixed'
type DuplicateMode = 'skip' | 'update' | 'skip_all'

const FIELD_MAP: Record<string, string[]> = {
  nom: ['nom', 'name', 'lastname', 'last name', 'surname', 'family name'],
  prenoms: ['prenoms', 'prénoms', 'prenom', 'prénom', 'firstname', 'first name', 'given name', 'prenom(s)'],
  telephone: ['telephone', 'téléphone', 'phone', 'tel', 'mobile', 'contact', 'portable', 'whatsapp', 'tél'],
  adresse: ['adresse', 'address', 'addr', 'ville', 'city', 'localisation', 'lieu'],
  sexe: ['sexe', 'sex', 'gender', 'genre', 'civilite', 'civilité'],
  date_naissance: ['date_naissance', 'date de naissance', 'birthdate', 'birth date', 'ddn', 'naissance', 'date naissance', 'born'],
  fonction: ['fonction', 'function', 'role', 'rôle', 'poste', 'position', 'titre'],
  statut_member: ['statut', 'status', 'état', 'etat', 'member status'],
  montant: ['montant', 'amount', 'somme', 'prix', 'price', 'total', 'valeur', 'value', 'montant paye', 'payé'],
  annee: ['annee', 'année', 'year', 'an', 'exercise', 'exercice'],
  date_paiement: ['date_paiement', 'date paiement', 'date payment', 'payment date', 'date_payé', 'date', 'payé le'],
  mode_paiement: ['mode_paiement', 'mode paiement', 'payment mode', 'moyen', 'moyen paiement', 'payment method', 'type paiement'],
  statut_paiement: ['statut_paiement', 'statut paiement', 'payment status', 'etat paiement'],
  observation: ['observation', 'notes', 'commentaire', 'comment', 'remarque', 'note'],
  titre: ['titre', 'title', 'intitule', 'intitulé', 'libelle', 'libellé', 'motif'],
  description: ['description', 'desc', 'descriptif'],
  date_limite: ['date_limite', 'date limite', 'deadline', 'limit date', 'limite', 'échéance', 'echeance'],
  type_cotisation: ['type', 'type cotisation', 'categorie', 'catégorie'],
  date_reunion: ['date_reunion', 'date réunion', 'meeting date', 'date reunion', 'date'],
  heure: ['heure', 'time', 'horaire', 'h', 'hour', 'debut', 'début'],
  lieu: ['lieu', 'place', 'location', 'endroit', 'salle'],
  objet: ['objet', 'subject', 'sujet', 'theme', 'thème', 'topic', 'motif reunion'],
  statut_presence: ['statut_presence', 'statut présence', 'presence', 'présence', 'attendance', 'statut'],
  contribution_annee: ['contribution_annee', 'contribution annee', 'cotisation', 'contribution year', 'exercice'],
  contribution_titre: ['contribution_titre', 'contribution titre', 'cotisation titre', 'special contribution'],
  reference: ['reference', 'référence', 'ref', 'numéro', 'numero', 'code'],
  responsable: ['responsable', 'bénéficiaire', 'beneficiaire', 'notes', 'notes / bénéficiaire', 'bénéf', 'benef', 'destinataire', 'fournisseur', 'prestataire'],
  categorie_depense: ['categorie', 'catégorie', 'category', 'type depense', 'type dépense', 'nature'],
}

const MEMBER_FIELDS = ['nom', 'prenoms', 'telephone', 'adresse', 'sexe', 'date_naissance', 'fonction', 'statut_member']
const ANNUAL_CONTRIB_FIELDS = ['annee', 'montant', 'description', 'date_limite']
const SPECIAL_CONTRIB_FIELDS = ['titre', 'description', 'montant', 'date_limite', 'type_cotisation']
const PAYMENT_FIELDS = ['montant', 'date_paiement', 'mode_paiement', 'statut_paiement', 'observation', 'contribution_annee', 'contribution_titre']
const ATTENDANCE_FIELDS = ['date_reunion', 'heure', 'lieu', 'objet', 'statut_presence']
const DECAISSEMENT_FIELDS = ['description', 'montant', 'date', 'responsable', 'observation', 'categorie_depense', 'reference']

const FIELD_GROUP_LABELS: Record<string, string> = {
  nom: 'Membres', prenoms: 'Membres', telephone: 'Membres', adresse: 'Membres',
  sexe: 'Membres', date_naissance: 'Membres', fonction: 'Membres', statut_member: 'Membres',
  annee: 'Cotisations', montant: 'Cotisations', description: 'Cotisations', date_limite: 'Cotisations',
  titre: 'Cotisations', type_cotisation: 'Cotisations',
  date_paiement: 'Paiements', mode_paiement: 'Paiements', statut_paiement: 'Paiements',
  observation: 'Paiements', contribution_annee: 'Paiements', contribution_titre: 'Paiements',
  date_reunion: 'Présences', heure: 'Présences', lieu: 'Présences', objet: 'Présences', statut_presence: 'Présences',
  responsable: 'Décaissements', categorie_depense: 'Décaissements', reference: 'Décaissements',
}

function detectFields(columns: string[]): ColumnMatch[] {
  return columns.map(col => {
    const lower = col.toLowerCase().trim()
    let bestField = ''
    let bestConfidence = 0

    for (const [field, aliases] of Object.entries(FIELD_MAP)) {
      const exact = lower === field ? 1 : 0
      const aliasExact = aliases.some(a => lower === a) ? 0.95 : 0
      const aliasContains = aliases.some(a => lower.includes(a)) ? 0.7 : 0
      const aliasContained = aliases.some(a => a.includes(lower)) ? 0.5 : 0
      const score = Math.max(exact, aliasExact, aliasContains, aliasContained)
      if (score > bestConfidence) {
        bestConfidence = score
        bestField = field
      }
    }
    return { fileCol: col, targetField: bestField, confidence: bestConfidence }
  })
}

function detectDataType(mapping: ColumnMatch[]): DataType {
  const matched = mapping.filter(m => m.targetField && m.confidence > 0.3)
  const groups = matched.reduce((acc, m) => {
    const group = FIELD_GROUP_LABELS[m.targetField] || 'Autre'
    acc[group] = (acc[group] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (groups['Présences'] && groups['Présences'] >= 3) return 'attendances'
  if (groups['Paiements'] && groups['Paiements'] >= 2 && groups['Cotisations']) return 'payments'
  if (groups['Membres'] && groups['Membres'] >= 3) return 'members'
  if (groups['Décaissements'] && groups['Décaissements'] >= 2) return 'disbursements'
  if (groups['Cotisations'] && groups['Cotisations'] >= 2) {
    if (mapping.some(m => m.targetField === 'titre' || m.targetField === 'type_cotisation')) return 'special_contributions'
    if (mapping.some(m => m.targetField === 'annee')) return 'annual_contributions'
  }
  return 'mixed'
}

async function detectDuplicates(data: any[], mapping: ColumnMatch[]): Promise<DuplicateInfo[]> {
  const results: DuplicateInfo[] = []
  const phoneMap = new Map<string, string>()

  const phoneField = mapping.find(m => m.targetField === 'telephone' && m.confidence > 0.3)

  if (phoneField && data.length > 0) {
    const phones = data.map(row => String((row as any)[phoneField.fileCol] || '').trim()).filter(Boolean)
    const uniquePhones = [...new Set(phones)]
    if (uniquePhones.length > 0) {
      const { data: existing } = await supabase.from('members').select('id, telephone')
        .in('telephone', uniquePhones.slice(0, 200))
      if (existing) existing.forEach(m => { if (m.telephone) phoneMap.set(m.telephone, m.id) })
    }
  }

  data.forEach((row, i) => {
    const phone = phoneField ? String((row as any)[phoneField.fileCol] || '').trim() : ''
    if (phone && phoneMap.has(phone)) {
      results.push({ rowIndex: i, existingId: phoneMap.get(phone)!, matchField: 'Téléphone', matchValue: phone })
    }
  })

  return results
}

const emptyReport = (): ImportReport => ({
  total: 0,
  members: { created: 0, updated: 0, skipped: 0, errors: 0 },
  annualContribs: { created: 0, updated: 0, skipped: 0, errors: 0 },
  specialContribs: { created: 0, updated: 0, skipped: 0, errors: 0 },
  payments: { created: 0, updated: 0, skipped: 0, errors: 0 },
  attendances: { created: 0, updated: 0, skipped: 0, errors: 0 },
  disbursements: { created: 0, updated: 0, skipped: 0, errors: 0 },
  details: [],
})

function reportSummary(report: ImportReport) {
  const total = report.members.created + report.members.updated + report.annualContribs.created +
    report.annualContribs.updated + report.specialContribs.created + report.specialContribs.updated +
    report.payments.created + report.payments.updated + report.attendances.created + report.attendances.updated +
    report.disbursements.created + report.disbursements.updated
  return { total, errors: report.members.errors + report.annualContribs.errors + report.specialContribs.errors + report.payments.errors + report.attendances.errors + report.disbursements.errors }
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [allData, setAllData] = useState<any[]>([])
  const [preview, setPreview] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMatch[]>([])
  const [dataType, setDataType] = useState<DataType>('mixed')
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [dupMode, setDupMode] = useState<DuplicateMode>('skip')
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload')
  const [importingProgress, setImportingProgress] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [headerRow, setHeaderRow] = useState(0)
  const [defaultYear, setDefaultYear] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const workbookRef = useRef<XLSX.WorkBook | null>(null)
  const queryClient = useQueryClient()

  const allFields = useMemo(() => {
    const fields = [...MEMBER_FIELDS, ...ANNUAL_CONTRIB_FIELDS, ...SPECIAL_CONTRIB_FIELDS, ...PAYMENT_FIELDS, ...ATTENDANCE_FIELDS, ...DECAISSEMENT_FIELDS]
    return [...new Set(fields)]
  }, [])

  function loadSheet(name: string, headerIdx?: number) {
    if (!workbookRef.current) return
    const ws = workbookRef.current.Sheets[name]
    const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' }) as any[][]
    if (rawRows.length === 0) { toast.error(`L'onglet "${name}" est vide`); return }

    const hIdx = headerIdx ?? headerRow
    const hdrRow = rawRows[hIdx]
    if (!hdrRow || hdrRow.every((c: any) => String(c || '').trim() === '')) {
      toast.error(`La ligne ${hIdx + 1} ne contient pas d'en-têtes valides`)
      return
    }

    // Build column names from header row
    const cols = hdrRow.map((c: any) => String(c || '').trim())
    // Filter out empty trailing column names
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
    setAllData(json)
    setColumns(cleanCols)
    setPreview(json.slice(0, 20))
    const detected = detectFields(cleanCols)
    setMapping(detected)
    setDataType(detectDataType(detected))
    setHeaderRow(hIdx)
    setStep('mapping')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setAllData([])
    setReport(null)
    setDuplicates([])
    setStep('upload')

    const reader = new FileReader()
    reader.onload = (evt) => {
      const buf = new Uint8Array(evt.target?.result as ArrayBuffer)
      const wb = XLSX.read(buf, { type: 'array' })
      workbookRef.current = wb
      setSheetNames(wb.SheetNames)
      setSelectedSheet(wb.SheetNames[0])
      setHeaderRow(0)
      loadSheet(wb.SheetNames[0], 0)
    }
    reader.readAsArrayBuffer(f)
  }

  function updateMapping(index: number, targetField: string) {
    const newMap = [...mapping]
    newMap[index] = { ...newMap[index], targetField, confidence: targetField ? 1 : 0 }
    setMapping(newMap)
    setDataType(detectDataType(newMap))
  }

  async function analyzeDuplicates() {
    if (!file || allData.length === 0) return
    setAnalyzing(true)
    await new Promise(r => setTimeout(r, 50))
    const dups = await detectDuplicates(allData, mapping)
    setDuplicates(dups)
    setStep('preview')
    setAnalyzing(false)
  }

  async function executeImport() {
    if (!file || allData.length === 0) return
    setImporting(true)
    const rep = emptyReport()
    rep.total = allData.length
    try {
      rep.details.push(`Fichier: ${file.name}, ${allData.length} lignes`)
      rep.details.push(`Colonnes trouvées: ${columns.join(', ') || 'aucune'}`)
      rep.details.push(`Mapping: ${mapping.filter(m => m.targetField).map(m => `${m.fileCol}->${m.targetField}`).join(', ') || 'aucun'}`)

      // Check first row values
      if (allData.length > 0) {
        const sample = allData[0] as any
        const sampleVals = mapping.filter(m => m.targetField).map(m => `${m.targetField}="${String(sample[m.fileCol] || '').trim()}"`).join(', ')
        rep.details.push(`Première ligne: ${sampleVals || 'aucune valeur extraite'}`)
      }

      const phoneField = mapping.find(m => m.targetField === 'telephone' && m.confidence > 0.3)
      const nomField = mapping.find(m => m.targetField === 'nom' && m.confidence > 0.3)
      const prenomsField = mapping.find(m => m.targetField === 'prenoms' && m.confidence > 0.3)
      const montantField = mapping.find(m => m.targetField === 'montant' && m.confidence > 0.3)
      const anneeField = mapping.find(m => m.targetField === 'annee' && m.confidence > 0.3)
      const titreField = mapping.find(m => m.targetField === 'titre' && m.confidence > 0.3)
      const datePaiementField = mapping.find(m => m.targetField === 'date_paiement' && m.confidence > 0.3)
      const modePaiementField = mapping.find(m => m.targetField === 'mode_paiement' && m.confidence > 0.3)
      const statutPaiementField = mapping.find(m => m.targetField === 'statut_paiement' && m.confidence > 0.3)
      const dateReunionField = mapping.find(m => m.targetField === 'date_reunion' && m.confidence > 0.3)
      const heureField = mapping.find(m => m.targetField === 'heure' && m.confidence > 0.3)
      const lieuField = mapping.find(m => m.targetField === 'lieu' && m.confidence > 0.3)
      const objetField = mapping.find(m => m.targetField === 'objet' && m.confidence > 0.3)
      const presenceField = mapping.find(m => m.targetField === 'statut_presence' && m.confidence > 0.3)
      const contribAnneeField = mapping.find(m => m.targetField === 'contribution_annee' && m.confidence > 0.3)
      const contribTitreField = mapping.find(m => m.targetField === 'contribution_titre' && m.confidence > 0.3)
      const dateLimiteField = mapping.find(m => m.targetField === 'date_limite' && m.confidence > 0.3)
      const descField = mapping.find(m => m.targetField === 'description' && m.confidence > 0.3)
      const typeCotField = mapping.find(m => m.targetField === 'type_cotisation' && m.confidence > 0.3)
      const obsField = mapping.find(m => m.targetField === 'observation' && m.confidence > 0.3)
      const responsableField = mapping.find(m => m.targetField === 'responsable' && m.confidence > 0.3)
      const refField = mapping.find(m => m.targetField === 'reference' && m.confidence > 0.3)
      const categorieDepenseField = mapping.find(m => m.targetField === 'categorie_depense' && m.confidence > 0.3)

      const extractValue = (row: any, field: typeof mapping[0] | undefined) =>
        field ? String((row as any)[field.fileCol] || '').trim() : ''

      const extractNum = (row: any, field: typeof mapping[0] | undefined) => {
        const v = extractValue(row, field)
        return parseInt(v.replace(/[^0-9]/g, '')) || 0
      }

      // Count rows by condition for diagnostics
      let countNom = 0, countMontant = 0, countContrib = 0, countAtt = 0, countDesc = 0
      for (const row of allData) {
        const r = row as any
        const p = extractValue(r, phoneField)
        const n = extractValue(r, nomField)
        const pr = extractValue(r, prenomsField)
        const m = extractNum(r, montantField)
        const a = extractNum(r, anneeField) || parseInt(extractValue(r, anneeField))
        const t = extractValue(r, titreField)
        const d = extractValue(r, descField)
        if (n || pr || p) countNom++
        if (m > 0) countMontant++
        if (a || t) countContrib++
        if (extractValue(r, dateReunionField)) countAtt++
        if (d) countDesc++
      }
      rep.details.push(`Lignes avec nom: ${countNom}, montant: ${countMontant}, cotisation: ${countContrib}, réunion: ${countAtt}, description: ${countDesc}`)

      // Pre-fetch existing members for duplicate detection
      const { data: existingMembers } = await supabase.from('members').select('id, telephone, nom, prenoms')
      const memberByPhone = new Map<string, string>()
      const memberByName = new Map<string, string>()
      if (existingMembers) {
        for (const m of existingMembers) {
          if (m.telephone) memberByPhone.set(m.telephone.replace(/[\s\-\.\/\(\)]/g, ''), m.id)
          memberByName.set(`${m.nom.toLowerCase().trim()}|${(m.prenoms || '').toLowerCase().trim()}`, m.id)
        }
      }

      // Pre-fetch existing contributions
      const { data: existingAnnual } = await supabase.from('annual_contributions').select('id, annee')
      const { data: existingSpecial } = await supabase.from('special_contributions').select('id, titre')
      const annualByYear = new Map<number, string>()
      const specialByTitle = new Map<string, string>()
      if (existingAnnual) existingAnnual.forEach(c => annualByYear.set(c.annee, c.id))
      if (existingSpecial) existingSpecial.forEach(c => specialByTitle.set(c.titre.toLowerCase(), c.id))

      // Pre-fetch existing meetings
      const { data: existingMeetings } = await supabase.from('meetings').select('id, date, heure')
      const meetingByDate = new Map<string, string>()
      if (existingMeetings) existingMeetings.forEach(m => meetingByDate.set(`${m.date}|${m.heure}`, m.id))

      // Process rows
      for (let i = 0; i < allData.length; i++) {
        const row = allData[i] as any
        const phone = extractValue(row, phoneField)
        const nom = extractValue(row, nomField)
        const prenoms = extractValue(row, prenomsField)
        const montant = extractNum(row, montantField)
        const annee = extractNum(row, anneeField) || parseInt(extractValue(row, anneeField))
        const titreVal = extractValue(row, titreField)

        const hasNom = Boolean(nom || prenoms || phone)
        const hasMontant = montant > 0
        const isContrib = Boolean(annee || titreVal || defaultYear)
        const isAttendanceRow = Boolean(extractValue(row, dateReunionField))

        setImportingProgress(`Ligne ${i + 1}/${allData.length}...`)

        // --- MEMBER IMPORT ---
        if (hasNom) {
          const normalizedPhone = phone.replace(/[\s\-\.\/\(\)]/g, '')
          const existingId = memberByPhone.get(normalizedPhone) || memberByName.get(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`)

          const memberData: any = { nom, prenoms }
          memberData.telephone = phone || 'NEANT'
          if (extractValue(row, mapping.find(m => m.targetField === 'adresse'))) memberData.adresse = extractValue(row, mapping.find(m => m.targetField === 'adresse'))
          if (extractValue(row, mapping.find(m => m.targetField === 'sexe'))) {
            const s = extractValue(row, mapping.find(m => m.targetField === 'sexe')).toUpperCase()
            memberData.sexe = s === 'F' || s === 'FÉMININ' || s === 'FEMME' || s === 'FEMININ' ? 'F' : 'M'
          } else memberData.sexe = 'M'
          if (extractValue(row, mapping.find(m => m.targetField === 'date_naissance'))) memberData.date_naissance = extractValue(row, mapping.find(m => m.targetField === 'date_naissance'))
          if (extractValue(row, mapping.find(m => m.targetField === 'fonction'))) memberData.fonction = extractValue(row, mapping.find(m => m.targetField === 'fonction'))
          const rawStatut = extractValue(row, mapping.find(m => m.targetField === 'statut_member'))
          memberData.statut = rawStatut && (rawStatut.toLowerCase().includes('inactif') || rawStatut.toLowerCase().includes('inactive')) ? 'Inactif' : 'Actif'
          memberData.date_adhesion = new Date().toISOString().split('T')[0]

          if (existingId) {
            if (dupMode === 'update') {
              const { error } = await supabase.from('members').update(memberData).eq('id', existingId)
              if (!error) {
                rep.members.updated++
                memberByName.set(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`, existingId)
                if (phone) memberByPhone.set(phone.replace(/[\s\-\.\/\(\)]/g, ''), existingId)
                rep.details.push(`L${i + 1}: Membre ${nom} ${prenoms} mis à jour`)
              } else {
                rep.members.errors++
                rep.details.push(`L${i + 1}: Erreur mise à jour membre ${nom} ${prenoms}: ${error.message}`)
              }
            } else {
              rep.members.skipped++
              rep.details.push(`L${i + 1}: Membre ${nom} ${prenoms} ignoré (doublon)`)
            }
          } else {
            const { data: newMember, error } = await supabase.from('members').insert(memberData).select('id').single()
            if (!error && newMember) {
              rep.members.created++
              memberByName.set(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`, newMember.id)
              if (phone) memberByPhone.set(phone.replace(/[\s\-\.\/\(\)]/g, ''), newMember.id)
              rep.details.push(`L${i + 1}: Membre ${nom} ${prenoms} créé`)
            } else {
              rep.members.errors++
              rep.details.push(`L${i + 1}: Erreur création membre ${nom} ${prenoms}: ${error.message}`)
            }
          }
        }

        // --- ANNUAL CONTRIBUTION IMPORT ---
        if (annee && hasMontant && !titreVal) {
          const existingId = annualByYear.get(annee)
          const contribData: any = { annee, montant }
          if (extractValue(row, descField)) contribData.description = extractValue(row, descField)
          if (extractValue(row, dateLimiteField)) contribData.date_limite = extractValue(row, dateLimiteField)

          if (existingId) {
            rep.annualContribs.skipped++
            rep.details.push(`L${i + 1}: Cotisation annuelle ${annee} ignorée (existe déjà)`)
          } else {
            const { error } = await supabase.from('annual_contributions').insert(contribData)
            if (!error) { rep.annualContribs.created++; rep.details.push(`L${i + 1}: Cotisation annuelle ${annee} créée`) }
            else { rep.annualContribs.errors++; rep.details.push(`L${i + 1}: Erreur création cotisation ${annee}: ${error.message}`) }
          }
        }

        // --- SPECIAL CONTRIBUTION IMPORT ---
        if (titreVal && hasMontant) {
          const existingId = specialByTitle.get(titreVal.toLowerCase())
          const contribData: any = { titre: titreVal, montant }
          if (extractValue(row, descField)) contribData.description = extractValue(row, descField)
          if (extractValue(row, dateLimiteField)) contribData.date_limite = extractValue(row, dateLimiteField)
          if (extractValue(row, typeCotField)) {
            const t = extractValue(row, typeCotField)
            const validTypes = ['Décès', 'Mariage', 'Projet', 'Voyage', 'Événement', 'Soutien spécial', 'Autre']
            contribData.type = validTypes.includes(t) ? t : 'Autre'
          } else contribData.type = 'Autre'

          if (existingId) {
            rep.specialContribs.skipped++
            rep.details.push(`L${i + 1}: Cotisation exceptionnelle "${titreVal}" ignorée (existe déjà)`)
          } else {
            const { error } = await supabase.from('special_contributions').insert(contribData)
            if (!error) { rep.specialContribs.created++; rep.details.push(`L${i + 1}: Cotisation exceptionnelle "${titreVal}" créée`) }
            else { rep.specialContribs.errors++; rep.details.push(`L${i + 1}: Erreur création cotisation "${titreVal}": ${error.message}`) }
          }
        }

        // --- PAYMENT IMPORT ---
        if (hasMontant && isContrib && hasNom) {
          let contribId = ''
          let contribType: 'annual' | 'special' = 'annual'
          const contribYear = annee || parseInt(defaultYear)

          if (contribYear && annualByYear.has(contribYear)) {
            contribId = annualByYear.get(contribYear)!
          } else if (titreVal && specialByTitle.has(titreVal.toLowerCase())) {
            contribId = specialByTitle.get(titreVal.toLowerCase())!
            contribType = 'special'
          } else if (contribYear && !annualByYear.has(contribYear)) {
            const { data: newContrib, error: ce } = await supabase.from('annual_contributions').insert({ annee: contribYear, montant }).select().single()
            if (!ce && newContrib) { contribId = newContrib.id; annualByYear.set(contribYear, newContrib.id) }
          }

          if (contribId && hasNom) {
            const memberId = memberByPhone.get(phone.replace(/[\s\-\.\/\(\)]/g, '')) || memberByName.get(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`)
            if (memberId) {
              const table = contribType === 'annual' ? 'annual_payments' : 'special_payments'
              const paymentData: any = {
                contribution_id: contribId, member_id: memberId, montant,
                date_paiement: extractValue(row, datePaiementField) || new Date().toISOString().split('T')[0],
                mode_paiement: 'Espèces',
                statut: 'Confirmé'
              }
              if (extractValue(row, modePaiementField)) {
                const mp = extractValue(row, modePaiementField)
                paymentData.mode_paiement = ['Espèces', 'Mobile Money', 'Autres'].includes(mp) ? mp : 'Autres'
              }
              if (extractValue(row, statutPaiementField)) {
                const sp = extractValue(row, statutPaiementField)
                paymentData.statut = ['En attente', 'Confirmé', 'Rejeté'].includes(sp) ? sp : 'Confirmé'
              }
              if (extractValue(row, obsField)) paymentData.observation = extractValue(row, obsField)

              const { error } = await supabase.from(table).insert(paymentData)
              if (!error) { rep.payments.created++; rep.details.push(`L${i + 1}: Paiement ${montant} FCFA pour ${nom} ${prenoms} créé`) }
              else { rep.payments.errors++; rep.details.push(`L${i + 1}: Erreur paiement ${nom} ${prenoms}: ${error.message}`) }
            } else {
              rep.payments.errors++
              rep.details.push(`L${i + 1}: Membre ${nom} ${prenoms} introuvable pour le paiement`)
            }
          }
        }

        // --- ATTENDANCE IMPORT ---
        if (isAttendanceRow) {
          const dateVal = extractValue(row, dateReunionField)
          const heureVal = extractValue(row, heureField) || '00:00'
          const meetingKey = `${dateVal}|${heureVal}`

          let meetingId = meetingByDate.get(meetingKey)
          if (!meetingId && dateVal) {
            const meetingData: any = { date: dateVal, heure: heureVal }
            meetingData.lieu = extractValue(row, lieuField) || 'Importé'
            meetingData.objet = extractValue(row, objetField) || 'Réunion importée'
            const { data: newMeeting, error: me } = await supabase.from('meetings').insert(meetingData).select().single()
            if (!me && newMeeting) { meetingId = newMeeting.id; meetingByDate.set(meetingKey, newMeeting.id) }
          }

          if (meetingId && hasNom) {
            const memberId = memberByPhone.get(phone.replace(/[\s\-\.\/\(\)]/g, '')) || memberByName.get(`${nom.toLowerCase()}|${prenoms.toLowerCase()}`)
            if (memberId) {
              const rawPresence = extractValue(row, presenceField).toLowerCase()
              let attStatut: 'Présent' | 'Absent' | 'Excusé' = 'Présent'
              if (rawPresence.includes('absent') || rawPresence.includes('absen')) attStatut = 'Absent'
              else if (rawPresence.includes('excuse') || rawPresence.includes('excuse') || rawPresence.includes('excus')) attStatut = 'Excusé'

              const { error } = await supabase.from('attendances').upsert(
                { meeting_id: meetingId, member_id: memberId, statut: attStatut },
                { onConflict: 'meeting_id, member_id' }
              )
              if (!error) { rep.attendances.created++; rep.details.push(`L${i + 1}: Présence ${attStatut} pour ${nom} ${prenoms} enregistrée`) }
              else { rep.attendances.errors++; rep.details.push(`L${i + 1}: Erreur présence ${nom} ${prenoms}: ${error.message}`) }
            }
          }
        }

        // --- DISBURSEMENT IMPORT ---
        const hasDescription = Boolean(extractValue(row, descField))
        if (hasDescription && hasMontant && !hasNom && !isContrib && !isAttendanceRow) {
          const ref = extractValue(row, refField) || `DEP-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(3, '0')}`
          const dateVal = extractValue(row, datePaiementField) || new Date().toISOString().split('T')[0]
          const resp = extractValue(row, responsableField) || extractValue(row, obsField) || ''

          const { data: newDisb, error: de } = await supabase.from('disbursements').insert({
            reference: ref,
            date: dateVal,
            responsable: resp || 'Non spécifié',
            total_montant: montant,
            observation: extractValue(row, obsField) || '',
          }).select().single()

          if (de) {
            rep.disbursements.errors++
            rep.details.push(`L${i + 1}: Erreur décaissement "${extractValue(row, descField)}": ${de.message}`)
          } else if (newDisb) {
            const { error: ie } = await supabase.from('disbursement_items').insert({
              disbursement_id: newDisb.id,
              designation: extractValue(row, descField),
              montant,
            })
            if (ie) rep.disbursements.errors++
            else {
              rep.disbursements.created++
              rep.details.push(`L${i + 1}: Décaissement ${ref} - ${formatCurrency(montant)}`)
            }
          }
        }
      }

      // Save import log
      const s = reportSummary(rep)
      await supabase.from('import_logs').insert({
        fichier: file.name, type: dataType,
        lignes_total: rep.total, lignes_importees: s.total, lignes_erreurs: s.errors,
        rapport: JSON.stringify(rep)
      })

      queryClient.invalidateQueries()
      setReport(rep)
      setStep('done')
      toast.success('Importation terminée avec succès')
    } catch (err: any) {
      rep.details.push(`ERREUR: ${err?.message || err || 'Erreur inconnue'}`)
      toast.error(err?.message || "Erreur lors de l'importation")
      setReport(rep)
    } finally {
      setImporting(false)
      setImportingProgress('')
    }
  }

  const renderStatBox = (label: string, created: number, updated: number, skipped: number, errors: number, color: string) => (
    <div className={`p-3 rounded-lg ${color}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <div className="flex gap-3 text-sm font-semibold">
        <span className="text-green-700">{created > 0 && `+${created}`}</span>
        <span className="text-blue-700">{updated > 0 && `~${updated}`}</span>
        <span className="text-amber-700">{skipped > 0 && `-${skipped}`}</span>
        <span className="text-red-700">{errors > 0 && `!${errors}`}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      <div className="page-header">
        <h1 className="page-title">Import Excel / CSV</h1>
        <p className="text-sm text-secondary-500">Importez membres, cotisations, paiements et présences</p>
      </div>

      {/* STEP 1: Upload */}
      <Card>
        <CardHeader>
          <h3 className="text-sm sm:text-base font-semibold text-secondary-900">
            {step === 'upload' ? '1. Sélectionner un fichier' : 'Fichier source'}
          </h3>
        </CardHeader>
        <CardBody>
          <div className="border-2 border-dashed border-secondary-300 rounded-xl p-6 sm:p-8 text-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-secondary-600 mb-2">
              {file ? file.name : 'Glissez un fichier ou cliquez pour sélectionner'}
            </p>
            <p className="text-xs text-secondary-400 mb-4">Formats supportés: XLSX, XLS, CSV</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                {file ? 'Changer de fichier' : 'Sélectionner un fichier'}
              </Button>
              {file && step !== 'upload' && (
                <Badge variant="success">Fichier chargé</Badge>
              )}
            </div>
            {sheetNames.length > 1 && step !== 'upload' && (
              <div className="mt-3 flex items-center gap-2 justify-center">
                <span className="text-xs text-secondary-500">Onglet:</span>
                <select value={selectedSheet} onChange={e => {
                  setSelectedSheet(e.target.value)
                  loadSheet(e.target.value, 0)
                }} className="px-2 py-1 rounded border border-secondary-300 text-sm">
                  {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {file && step !== 'upload' && (
              <div className="mt-3 flex items-center gap-2 justify-center">
                <span className="text-xs text-secondary-500">Ligne d'en-tête:</span>
                <button
                  onClick={() => { const h = Math.max(0, headerRow - 1); loadSheet(selectedSheet, h) }}
                  className="px-2 py-1 rounded border border-secondary-300 text-xs hover:bg-secondary-50"
                  disabled={headerRow <= 0}
                >−</button>
                <span className="text-xs font-medium w-6 text-center">{headerRow + 1}</span>
                <button
                  onClick={() => loadSheet(selectedSheet, headerRow + 1)}
                  className="px-2 py-1 rounded border border-secondary-300 text-xs hover:bg-secondary-50"
                >+</button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* STEP 2: Mapping */}
      {mapping.length > 0 && step === 'mapping' && (
        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">2. Correspondance des colonnes</h3>
          </CardHeader>
          <CardBody>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-medium text-secondary-500">Type détecté:</span>
              <Badge variant={dataType === 'mixed' ? 'warning' : 'success'}>
                {dataType === 'members' ? 'Membres' :
                 dataType === 'annual_contributions' ? 'Cotisations annuelles' :
                 dataType === 'special_contributions' ? 'Cotisations exceptionnelles' :
                 dataType === 'payments' ? 'Paiements' :
                 dataType === 'attendances' ? 'Présences' :
                 dataType === 'disbursements' ? 'Décaissements' : 'Mixte'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              {mapping.map((m, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 bg-secondary-50 rounded-lg">
                  <span className="text-xs sm:text-sm font-medium w-28 sm:w-40 truncate" title={m.fileCol}>{m.fileCol}</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-secondary-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  <select
                    value={m.targetField}
                    onChange={e => updateMapping(i, e.target.value)}
                    className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 rounded border border-secondary-300 text-xs sm:text-sm"
                  >
                    <option value="">Ignorer</option>
                    <optgroup label="Membres">
                      {MEMBER_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    <optgroup label="Cotisations annuelles">
                      {ANNUAL_CONTRIB_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    <optgroup label="Cotisations exceptionnelles">
                      {SPECIAL_CONTRIB_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    <optgroup label="Paiements">
                      {PAYMENT_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    <optgroup label="Présences">
                      {ATTENDANCE_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                    <optgroup label="Décaissements">
                      {DECAISSEMENT_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </optgroup>
                  </select>
                  {m.confidence > 0.5 && (
                    <Badge variant="success" className="hidden sm:inline">Auto</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mb-4">
              <h4 className="text-xs sm:text-sm font-semibold text-secondary-700 mb-2">Aperçu ({preview.length} lignes)</h4>
              <div className="overflow-x-auto rounded-lg border border-secondary-200">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-secondary-50">
                      {columns.map(col => <th key={col} className="px-2 sm:px-3 py-2 text-left font-semibold text-secondary-600 uppercase whitespace-nowrap">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-secondary-100">
                        {columns.map(col => <td key={col} className="px-2 sm:px-3 py-2 text-secondary-600 max-w-[200px] truncate">{String((row as any)[col] || '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={analyzeDuplicates} loading={analyzing} disabled={analyzing}>
                {analyzing ? 'Analyse en cours...' : 'Analyser les doublons'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 3: Duplicate handling + import */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">3. Gestion des doublons et importation</h3>
          </CardHeader>
          <CardBody>
            {duplicates.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {duplicates.length} ligne(s) détectée(s) comme doublon potentiel
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="dupMode" checked={dupMode === 'skip'} onChange={() => setDupMode('skip')} className="accent-primary-600" />
                    <span className="text-sm text-secondary-700">Ignorer les doublons</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="dupMode" checked={dupMode === 'update'} onChange={() => setDupMode('update')} className="accent-primary-600" />
                    <span className="text-sm text-secondary-700">Mettre à jour les doublons</span>
                  </label>
                </div>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="mb-4 overflow-x-auto rounded-lg border border-secondary-200 max-h-48 overflow-y-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-secondary-50">
                      <th className="px-3 py-2 text-left font-semibold text-secondary-600">Ligne</th>
                      <th className="px-3 py-2 text-left font-semibold text-secondary-600">Champ</th>
                      <th className="px-3 py-2 text-left font-semibold text-secondary-600">Valeur</th>
                      <th className="px-3 py-2 text-left font-semibold text-secondary-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.map((d, i) => (
                      <tr key={i} className="border-t border-secondary-100">
                        <td className="px-3 py-2 text-secondary-600">#{d.rowIndex + 1}</td>
                        <td className="px-3 py-2 text-secondary-600">{d.matchField}</td>
                        <td className="px-3 py-2 text-secondary-600">{d.matchValue}</td>
                        <td className="px-3 py-2">
                          <Badge variant={dupMode === 'skip' ? 'warning' : 'info'}>
                            {dupMode === 'skip' ? 'Ignoré' : 'Mis à jour'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(() => {
              const hasAnnee = mapping.some(m => m.targetField === 'annee' || m.targetField === 'contribution_annee')
              const hasTitre = mapping.some(m => m.targetField === 'titre' || m.targetField === 'contribution_titre')
              const hasMontantCol = mapping.some(m => m.targetField === 'montant')
              const hasNomCol = mapping.some(m => m.targetField === 'nom' || m.targetField === 'prenoms')
              if (!hasAnnee && !hasTitre && hasMontantCol && hasNomCol) {
                return (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="text-sm font-medium text-blue-800">
                      Année de cotisation par défaut (pour les paiements)
                    </label>
                    <input type="number" value={defaultYear} onChange={e => setDefaultYear(e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 rounded border border-blue-300 text-sm"
                      placeholder="Ex: 2024" />
                  </div>
                )
              }
              return null
            })()}

            <div className="flex gap-2">
              <Button
                onClick={executeImport}
                loading={importing}
                disabled={importing}
              >
                {importing ? importingProgress || 'Importation...' : 'Lancer l\'importation'}
              </Button>
              <Button variant="secondary" onClick={() => setStep('mapping')}>
                Retour au mapping
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 4: Report */}
      {report && step === 'done' && (
        <Card>
          <CardHeader>
            <h3 className="text-sm sm:text-base font-semibold text-secondary-900">4. Rapport d'importation</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-4 bg-secondary-50 rounded-xl text-center">
                <p className="text-xl sm:text-2xl font-bold text-secondary-900">{report.total}</p>
                <p className="text-xs text-secondary-500">Lignes analysées</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">{reportSummary(report).total}</p>
                <p className="text-xs text-emerald-600">Importées</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-700">
                  {report.members.skipped + report.annualContribs.skipped + report.specialContribs.skipped + report.payments.skipped + report.attendances.skipped + report.disbursements.skipped}
                </p>
                <p className="text-xs text-amber-600">Ignorées</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-xl sm:text-2xl font-bold text-red-700">{reportSummary(report).errors}</p>
                <p className="text-xs text-red-600">Erreurs</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {renderStatBox('Membres', report.members.created, report.members.updated, report.members.skipped, report.members.errors, 'bg-blue-50')}
              {report.annualContribs.created + report.annualContribs.errors > 0 && renderStatBox('Cotisations annuelles', report.annualContribs.created, report.annualContribs.updated, report.annualContribs.skipped, report.annualContribs.errors, 'bg-purple-50')}
              {report.specialContribs.created + report.specialContribs.errors > 0 && renderStatBox('Cotisations exceptionnelles', report.specialContribs.created, report.specialContribs.updated, report.specialContribs.skipped, report.specialContribs.errors, 'bg-indigo-50')}
              {report.payments.created + report.payments.errors > 0 && renderStatBox('Paiements', report.payments.created, report.payments.updated, report.payments.skipped, report.payments.errors, 'bg-teal-50')}
              {report.attendances.created + report.attendances.errors > 0 && renderStatBox('Présences', report.attendances.created, report.attendances.updated, report.attendances.skipped, report.attendances.errors, 'bg-rose-50')}
              {report.disbursements.created + report.disbursements.errors > 0 && renderStatBox('Décaissements', report.disbursements.created, report.disbursements.updated, report.disbursements.skipped, report.disbursements.errors, 'bg-orange-50')}
            </div>

            {report.details.length > 0 && (
              <div>
                <div className="max-h-60 overflow-y-auto bg-secondary-50 rounded-lg p-3 text-xs text-secondary-600 font-mono">
                  {report.details.map((d, i) => <div key={i}>{d}</div>)}
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button variant="secondary" onClick={() => {
                setFile(null); setAllData([]); setPreview([]); setColumns([]); setMapping([]); setReport(null)
                setDuplicates([]); setStep('upload')
              }}>
                Nouvel import
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
