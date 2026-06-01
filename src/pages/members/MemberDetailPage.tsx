import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardBody, Badge, Button, Modal, LoadingSpinner, PageHeader, Input, Select } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useMember, useAnnualPayments, useSpecialPayments, useAttendances, useUpdateMember, useDeleteMember } from '@/services/queries'
import { formatDate, formatCurrency, getInitials } from '@/utils'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: member, isLoading } = useMember(id!)
  const { data: annualPayments } = useAnnualPayments()
  const { data: specialPayments } = useSpecialPayments()
  const { data: attendances } = useAttendances()
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ nom: '', prenoms: '', telephone: '', adresse: '', sexe: 'M', date_naissance: '', fonction: '' })
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  if (isLoading) return <LoadingSpinner />
  if (!member) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="w-16 h-16 text-secondary-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <h2 className="text-lg font-semibold text-secondary-900">Membre non trouvé</h2>
      <Button variant="secondary" className="mt-4" onClick={() => navigate('/members')}>Retour à la liste</Button>
    </div>
  )

  const m = member
  const memberAnnualPayments = (annualPayments || []).filter(p => p.member_id === member.id && p.statut === 'Confirmé')
  const memberSpecialPayments = (specialPayments || []).filter(p => p.member_id === member.id && p.statut === 'Confirmé')
  const memberAttendances = (attendances || []).filter(a => a.member_id === member.id)
  const totalPaid = [...memberAnnualPayments, ...memberSpecialPayments].reduce((s, p) => s + Number(p.montant), 0)
  const presences = memberAttendances.filter(a => a.statut === 'Présent').length
  const absences = memberAttendances.filter(a => a.statut === 'Absent').length
  const excuses = memberAttendances.filter(a => a.statut === 'Excusé').length
  const participationRate = memberAttendances.length > 0 ? Math.round((presences / memberAttendances.length) * 100) : 0

  const getPrintContent = () => {
    const m = member
    return `
    <!DOCTYPE html><html lang="fr">
    <head><meta charset="UTF-8"><title>${m.prenoms} ${m.nom} - Fiche membre</title>
    <style>
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 4px 0 0; color: #666; font-size: 13px; }
      .initials { width: 80px; height: 80px; border-radius: 50%; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto 12px; }
      h2 { text-align: center; margin: 0; font-size: 20px; }
      .subtitle { text-align: center; color: #666; font-size: 13px; margin: 4px 0 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
      td { padding: 8px 12px; border-bottom: 1px solid #eee; }
      td:first-child { font-weight: 500; color: #666; width: 200px; }
      .section-title { font-size: 16px; font-weight: 700; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin: 24px 0 12px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
      .row span:last-child { font-weight: 600; }
      .footer { text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 32px; }
    </style></head>
    <body>
      <div class="header"><h1>Eyo-Enian</h1><p>Fiche d'adhesion</p></div>
      <div class="initials">${getInitials(m.nom, m.prenoms)}</div>
      <h2>${m.prenoms} ${m.nom}</h2>
      <p class="subtitle">${m.fonction || 'Membre'} - ${m.statut}</p>
      <table>
        <tr><td>Nom</td><td>${m.nom}</td></tr>
        <tr><td>Prenoms</td><td>${m.prenoms}</td></tr>
        <tr><td>Telephone</td><td>${m.telephone}</td></tr>
        <tr><td>Sexe</td><td>${m.sexe === 'M' ? 'Homme' : 'Femme'}</td></tr>
        <tr><td>Date de naissance</td><td>${m.date_naissance ? formatDate(m.date_naissance) : '-'}</td></tr>
        <tr><td>Adresse</td><td>${m.adresse || '-'}</td></tr>
        <tr><td>Fonction</td><td>${m.fonction || '-'}</td></tr>
        <tr><td>Statut</td><td>${m.statut}</td></tr>
        <tr><td>Date d'adhesion</td><td>${formatDate(m.date_adhesion)}</td></tr>
      </table>
      <div class="section-title">Situation financiere</div>
      <table>
        <tr><td>Total paye</td><td>${formatCurrency(totalPaid)}</td></tr>
        <tr><td>Solde actuel</td><td>${formatCurrency(totalPaid)}</td></tr>
        <tr><td>Nombre de paiements</td><td>${memberAnnualPayments.length + memberSpecialPayments.length}</td></tr>
      </table>
      ${memberAnnualPayments.length > 0 ? `
        <div style="font-weight:600;font-size:14px;margin-top:16px;">Cotisations annuelles</div>
        ${memberAnnualPayments.map(p => `<div class="row"><span>${p.contribution?.annee} - ${formatDate(p.date_paiement)}</span><span>${formatCurrency(p.montant)}</span></div>`).join('')}
      ` : ''}
      ${memberSpecialPayments.length > 0 ? `
        <div style="font-weight:600;font-size:14px;margin-top:16px;">Cotisations exceptionnelles</div>
        ${memberSpecialPayments.map(p => `<div class="row"><span>${p.contribution?.titre} - ${formatDate(p.date_paiement)}</span><span>${formatCurrency(p.montant)}</span></div>`).join('')}
      ` : ''}
      <div class="section-title">Presences</div>
      <table>
        <tr><td>Presences</td><td>${presences}</td></tr>
        <tr><td>Absences</td><td>${absences}</td></tr>
        <tr><td>Excuses</td><td>${excuses}</td></tr>
        <tr><td>Taux de participation</td><td>${participationRate}%</td></tr>
      </table>
      <div class="footer">Genere le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </body></html>
  `}

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(getPrintContent())
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={`${member.prenoms} ${member.nom}`} subtitle="Fiche membre">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setEditForm({ nom: member.nom, prenoms: member.prenoms || '', telephone: member.telephone || '', adresse: member.adresse || '', sexe: member.sexe || 'M', date_naissance: member.date_naissance || '', fonction: member.fonction || '' })
            setShowEditModal(true)
          }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Modifier
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowPrintPreview(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Aperçu
          </Button>
          <Button size="sm" onClick={() => navigate('/members')}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span className="hidden sm:inline">Retour</span>
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
              {getInitials(member.nom, member.prenoms)}
            </div>
            <h2 className="text-xl font-bold text-secondary-900">{member.prenoms} {member.nom}</h2>
            <p className="text-sm text-secondary-500 mt-0.5">{member.fonction || 'Membre'}</p>
            <div className="mt-3">
              <Badge variant={member.statut === 'Actif' ? 'success' : 'error'}>{member.statut}</Badge>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {member.statut === 'Actif' && (
                <Button size="sm" variant="secondary" onClick={() => setConfirmDeactivate(true)}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Désactiver
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(true)} className="!text-error">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Supprimer
              </Button>
            </div>
            <div className="mt-6 space-y-3 text-left divide-y divide-secondary-100">
              <InfoRow label="Téléphone" value={member.telephone} />
              <InfoRow label="Sexe" value={member.sexe === 'M' ? 'Homme' : 'Femme'} />
              <InfoRow label="Date naissance" value={member.date_naissance ? formatDate(member.date_naissance) : '-'} />
              <InfoRow label="Adhésion" value={formatDate(member.date_adhesion)} />
              {member.adresse && <InfoRow label="Adresse" value={member.adresse} />}
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <h3 className="font-semibold text-secondary-900 mb-4">Situation financière</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Total payé</p>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-primary-700">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-primary-600 font-medium mt-1">Solde actuel</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-700">{memberAnnualPayments.length + memberSpecialPayments.length}</p>
                  <p className="text-xs text-amber-600 font-medium mt-1">Paiements</p>
                </div>
              </div>
              {memberAnnualPayments.length === 0 && memberSpecialPayments.length === 0 && (
                <div className="text-center py-6 text-secondary-500 text-sm">Aucun paiement enregistré</div>
              )}
              {memberAnnualPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{p.contribution?.annee || '--'}</div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{formatDate(p.date_paiement)}</p>
                      <p className="text-xs text-secondary-500">{p.mode_paiement}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(p.montant)}</span>
                </div>
              ))}
              {memberSpecialPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{p.contribution?.titre?.charAt(0) || '--'}</div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900 truncate">{p.contribution?.titre || 'N/A'}</p>
                      <p className="text-xs text-secondary-500">{formatDate(p.date_paiement)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(p.montant)}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-secondary-900 mb-4">Présences aux réunions</h3>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-700">{presences}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Présent</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-700">{absences}</p>
                  <p className="text-xs text-red-600 font-medium mt-1">Absent</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-700">{excuses}</p>
                  <p className="text-xs text-amber-600 font-medium mt-1">Excusé</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">{participationRate}%</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">Taux</p>
                </div>
              </div>
              {memberAttendances.length > 0 ? (
                <div className="w-full bg-secondary-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${participationRate}%` }} />
                </div>
              ) : (
                <p className="text-sm text-secondary-500 text-center py-4">Aucune participation enregistrée</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={showPrintPreview} onClose={() => setShowPrintPreview(false)} title="Aperçu avant impression" className="max-w-3xl">
        <div className="bg-white">
          <div className="text-center mb-8 border-b border-gray-300 pb-6">
            <h1 className="text-2xl font-bold text-gray-900">Eyo-Enian</h1>
            <p className="text-sm text-gray-500">Fiche d'adhésion</p>
          </div>
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
              {getInitials(member.nom, member.prenoms)}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{member.prenoms} {member.nom}</h2>
            <p className="text-sm text-gray-500">{member.fonction || 'Membre'}</p>
          </div>
          <table className="w-full text-sm mb-8">
            <tbody>
              <PrintInfoRow label="Nom" value={member.nom} />
              <PrintInfoRow label="Prénoms" value={member.prenoms} />
              <PrintInfoRow label="Téléphone" value={member.telephone} />
              <PrintInfoRow label="Sexe" value={member.sexe === 'M' ? 'Homme' : 'Femme'} />
              <PrintInfoRow label="Date de naissance" value={member.date_naissance ? formatDate(member.date_naissance) : '-'} />
              <PrintInfoRow label="Adresse" value={member.adresse || '-'} />
              <PrintInfoRow label="Fonction" value={member.fonction || '-'} />
              <PrintInfoRow label="Statut" value={member.statut} />
              <PrintInfoRow label="Date d'adhésion" value={formatDate(member.date_adhesion)} />
            </tbody>
          </table>
          <div className="mb-8">
            <h3 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Situation financière</h3>
            <table className="w-full text-sm">
              <tbody>
                <PrintInfoRow label="Total payé" value={formatCurrency(totalPaid)} />
                <PrintInfoRow label="Solde actuel" value={formatCurrency(totalPaid)} />
                <PrintInfoRow label="Nombre de paiements" value={String(memberAnnualPayments.length + memberSpecialPayments.length)} />
              </tbody>
            </table>
            {memberAnnualPayments.length > 0 && (
              <><h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Cotisations annuelles</h4>
                {memberAnnualPayments.map(p => (
                  <div key={p.id} className="flex justify-between py-1 text-sm"><span>{p.contribution?.annee} - {formatDate(p.date_paiement)}</span><span className="font-semibold">{formatCurrency(p.montant)}</span></div>
                ))}</>
            )}
            {memberSpecialPayments.length > 0 && (
              <><h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Cotisations exceptionnelles</h4>
                {memberSpecialPayments.map(p => (
                  <div key={p.id} className="flex justify-between py-1 text-sm"><span>{p.contribution?.titre} - {formatDate(p.date_paiement)}</span><span className="font-semibold">{formatCurrency(p.montant)}</span></div>
                ))}</>
            )}
          </div>
          <div className="mb-8">
            <h3 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Présences</h3>
            <table className="w-full text-sm">
              <tbody>
                <PrintInfoRow label="Présences" value={String(presences)} />
                <PrintInfoRow label="Absences" value={String(absences)} />
                <PrintInfoRow label="Excusés" value={String(excuses)} />
                <PrintInfoRow label="Taux de participation" value={`${participationRate}%`} />
              </tbody>
            </table>
          </div>
          <div className="text-center text-xs text-gray-400 border-t border-gray-200 pt-4 mt-8">
            Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200 mt-4">
          <Button variant="secondary" onClick={() => setShowPrintPreview(false)}>Fermer</Button>
          <Button onClick={handlePrint}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimer
          </Button>
        </div>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier le membre" className="max-w-lg">
        <form onSubmit={e => {
          e.preventDefault()
          updateMember.mutate({ id: member.id, ...editForm, sexe: editForm.sexe as 'M' | 'F' }, {
            onSuccess: () => { toast.success('Membre mis à jour'); setShowEditModal(false) },
            onError: (e) => toast.error(e.message)
          })
        }} className="space-y-4">
          <Input label="Nom" value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} required />
          <Input label="Prénoms" value={editForm.prenoms} onChange={e => setEditForm(f => ({ ...f, prenoms: e.target.value }))} />
          <Input label="Téléphone" value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} />
          <Input label="Adresse" value={editForm.adresse} onChange={e => setEditForm(f => ({ ...f, adresse: e.target.value }))} />
          <Select label="Sexe" value={editForm.sexe} onChange={e => setEditForm(f => ({ ...f, sexe: e.target.value }))}
            options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} />
          <Input label="Date de naissance" type="date" value={editForm.date_naissance} onChange={e => setEditForm(f => ({ ...f, date_naissance: e.target.value }))} />
          <Input label="Fonction" value={editForm.fonction} onChange={e => setEditForm(f => ({ ...f, fonction: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button type="submit" loading={updateMember.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Désactiver le membre"
        message={`Êtes-vous sûr de vouloir désactiver ${member.prenoms} ${member.nom} ? Il pourra être réactivé plus tard.`}
        confirmLabel="Désactiver"
        variant="danger"
        loading={updateMember.isPending}
        onConfirm={() => {
          updateMember.mutate({ id: member.id, statut: 'Inactif' }, {
            onSuccess: () => { toast.success('Membre désactivé'); setConfirmDeactivate(false) },
            onError: (e) => toast.error(e.message)
          })
        }}
        onCancel={() => setConfirmDeactivate(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer le membre"
        message={`Êtes-vous sûr de vouloir supprimer définitivement ${member.prenoms} ${member.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteMember.isPending}
        onConfirm={() => {
          deleteMember.mutate(member.id, {
            onSuccess: () => { toast.success('Membre supprimé'); navigate('/members') },
            onError: (e) => toast.error(e.message)
          })
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 items-center">
      <span className="text-sm text-secondary-500">{label}</span>
      <span className="text-sm font-medium text-secondary-900 text-right">{value}</span>
    </div>
  )
}

function PrintInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-8 text-gray-500 font-medium w-48">{label}</td>
      <td className="py-2 text-gray-900">{value}</td>
    </tr>
  )
}
