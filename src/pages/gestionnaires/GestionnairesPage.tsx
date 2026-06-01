import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Card, CardBody, Modal, Input, LoadingSpinner, EmptyState, PageHeader, ConfirmDialog } from '@/components/ui'
import type { Profile } from '@/types'
import { formatDate } from '@/utils'

export function GestionnairesPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<Profile | null>(null)
  const [showEditPin, setShowEditPin] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [newPin, setNewPin] = useState('')
  const [form, setForm] = useState({ phone: '', full_name: '', pin: '' })

  const { data: gestionnaires, isLoading } = useQuery({
    queryKey: ['gestionnaires'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'gestionnaire')
        .order('created_at', { ascending: false })
      return (data || []) as Profile[]
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('phone', form.phone).maybeSingle()
      if (existing) throw new Error('Ce numéro est déjà utilisé')
      const { error } = await supabase.from('profiles').insert({
        phone: form.phone, full_name: form.full_name,
        role: 'gestionnaire', is_active: true, pin: form.pin
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestionnaires'] })
      toast.success('Gestionnaire créé')
      setShowCreate(false)
      setForm({ phone: '', full_name: '', pin: '' })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const toggleStatus = useMutation({
    mutationFn: async (g: Profile) => {
      const { error } = await supabase.from('profiles').update({ is_active: !g.is_active }).eq('id', g.id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gestionnaires'] }); toast.success('Statut mis à jour') }
  })

  const updatePinMutation = useMutation({
    mutationFn: async (g: Profile) => {
      const { error } = await supabase.from('profiles').update({ pin: newPin }).eq('id', g.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestionnaires'] })
      toast.success('PIN mis à jour')
      setShowEditPin(null)
      setNewPin('')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (g: Profile) => {
      const { error } = await supabase.from('profiles').delete().eq('id', g.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestionnaires'] })
      toast.success('Gestionnaire supprimé')
      setDeleteTarget(null)
      setShowDetail(null)
    },
    onError: (err: any) => toast.error(err.message)
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Gestionnaires" subtitle="Gérer les accès des gestionnaires">
        <Button onClick={() => { setForm({ phone: '', full_name: '', pin: '' }); setShowCreate(true) }}>Nouveau gestionnaire</Button>
      </PageHeader>

      {isLoading ? <LoadingSpinner /> : !gestionnaires?.length ? (
        <EmptyState title="Aucun gestionnaire" description="Créez le premier compte gestionnaire"
          action={<Button onClick={() => setShowCreate(true)}>Créer un gestionnaire</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gestionnaires.map(g => (
            <Card key={g.id}>
              <button className="w-full text-left" onClick={() => setShowDetail(g)}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-secondary-900">{g.full_name || 'Sans nom'}</h3>
                      <p className="text-sm text-secondary-500 mt-0.5">{g.phone}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'}`}>
                      {g.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </CardBody>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau gestionnaire">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Nom complet</label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nom du gestionnaire" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Numéro de téléphone</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 01 02 03 04 05" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Code PIN</label>
            <Input type="password" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="1234" maxLength={4} required />
            <p className="text-xs text-secondary-400 mt-1">PIN personnel à 4 chiffres pour la connexion</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Détails du gestionnaire">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-secondary-500">Nom</p>
                <p className="font-medium text-secondary-900">{showDetail.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-secondary-500">Téléphone</p>
                <p className="font-medium text-secondary-900">{showDetail.phone || '-'}</p>
              </div>
              <div>
                <p className="text-secondary-500">Statut</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${showDetail.is_active ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'}`}>
                  {showDetail.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div>
                <p className="text-secondary-500">PIN</p>
                <p className="font-medium text-secondary-900">{showDetail.pin ? '••••' : 'Non défini'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-secondary-500">Créé le</p>
                <p className="font-medium text-secondary-900">{showDetail.created_at ? formatDate(showDetail.created_at) : '-'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-secondary-200">
              <Button size="sm" variant="secondary" onClick={() => toggleStatus.mutate(showDetail)}>
                {showDetail.is_active ? 'Désactiver' : 'Activer'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setNewPin(''); setShowEditPin(showDetail) }}>
                Modifier le PIN
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteTarget(showDetail)}>
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit PIN modal */}
      <Modal open={!!showEditPin} onClose={() => setShowEditPin(null)} title="Modifier le PIN">
        {showEditPin && (
          <form onSubmit={e => { e.preventDefault(); updatePinMutation.mutate(showEditPin) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Nouveau PIN</label>
              <Input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="1234" maxLength={4} required />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowEditPin(null)}>Annuler</Button>
              <Button type="submit" loading={updatePinMutation.isPending}>Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Supprimer ce gestionnaire ?"
        message={deleteTarget ? `${deleteTarget.full_name} (${deleteTarget.phone}) ne pourra plus se connecter.` : ''}
        confirmLabel={deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
      />
    </div>
  )
}
