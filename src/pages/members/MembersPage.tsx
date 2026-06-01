import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Button, SearchFilters, Badge, Modal, Input, Select, Pagination, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui'
import { useMembers, useCreateMember } from '@/services/queries'
import { formatDate } from '@/utils'
import { useDebounce } from '@/hooks/useDebounce'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

export function MembersPage() {
  const { data: members, isLoading } = useMembers()
  const createMember = useCreateMember()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterSexe, setFilterSexe] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const [form, setForm] = useState({
    nom: '', prenoms: '', telephone: '', adresse: '', sexe: 'M',
    date_naissance: '', date_adhesion: new Date().toISOString().split('T')[0],
    fonction: '', statut: 'Actif'
  })

  const filtered = (members || []).filter(m => {
    const q = debouncedSearch.toLowerCase()
    const matchesSearch = !q || `${m.nom} ${m.prenoms} ${m.telephone}`.toLowerCase().includes(q)
    const matchesStatut = !filterStatut || m.statut === filterStatut
    const matchesSexe = !filterSexe || m.sexe === filterSexe
    return matchesSearch && matchesStatut && matchesSexe
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMember.mutateAsync({ ...form, sexe: form.sexe as 'M' | 'F', statut: form.statut as 'Actif' | 'Inactif' })
      toast.success('Membre ajouté avec succès')
      setShowModal(false)
      setForm({ nom: '', prenoms: '', telephone: '', adresse: '', sexe: 'M', date_naissance: '', date_adhesion: new Date().toISOString().split('T')[0], fonction: '', statut: 'Actif' })
    } catch (err: any) { toast.error(err.message || 'Erreur') }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Membres" subtitle={`${filtered.length} membre${filtered.length > 1 ? 's' : ''}`}>
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          <span className="hidden sm:inline">Ajouter un membre</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </PageHeader>

      <Card>
        <CardBody>
          <SearchFilters
            search={search}
            onSearchChange={v => { setSearch(v); setPage(1) }}
            searchPlaceholder="Rechercher par nom, prénom ou téléphone..."
            className="mb-4"
            filters={[
              { key: 'statut', label: 'Statut', value: filterStatut, onChange: v => { setFilterStatut(v); setPage(1) }, options: [{ value: 'Actif', label: 'Actif' }, { value: 'Inactif', label: 'Inactif' }] },
              { key: 'sexe', label: 'Sexe', value: filterSexe, onChange: v => { setFilterSexe(v); setPage(1) }, options: [{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }] },
            ]}
          />

          {paginated.length === 0 ? (
            <EmptyState title="Aucun membre trouvé" description={search ? 'Essayez de modifier vos filtres' : 'Commencez par ajouter un membre'}
              action={!search ? <Button onClick={() => setShowModal(true)}>Ajouter un membre</Button> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-200">
                    <th className="text-left py-3 px-2 font-medium text-secondary-600">N°</th>
                    <th className="text-left py-3 px-2 font-medium text-secondary-600">Nom</th>
                    <th className="text-left py-3 px-2 font-medium text-secondary-600">Prénoms</th>
                    <th className="text-left py-3 px-2 font-medium text-secondary-600">Téléphone</th>
                    <th className="text-center py-3 px-2 font-medium text-secondary-600 hidden md:table-cell">Sexe</th>
                    <th className="text-left py-3 px-2 font-medium text-secondary-600 hidden lg:table-cell">Fonction</th>
                    <th className="text-center py-3 px-2 font-medium text-secondary-600">Statut</th>
                    <th className="text-center py-3 px-2 font-medium text-secondary-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m, i) => (
                    <tr key={m.id} className="border-b border-secondary-100 hover:bg-secondary-50 cursor-pointer" onClick={() => navigate(`/members/${m.id}`)}>
                      <td className="py-3 px-2 text-secondary-500 text-center">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="py-3 px-2 font-medium text-secondary-900">{m.nom}</td>
                      <td className="py-3 px-2 text-secondary-700">{m.prenoms}</td>
                      <td className="py-3 px-2 text-secondary-700">{m.telephone}</td>
                      <td className="py-3 px-2 text-center hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${m.sexe === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {m.sexe === 'M' ? 'M' : 'F'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-secondary-500 hidden lg:table-cell">{m.fonction || '-'}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={m.statut === 'Actif' ? 'success' : 'error'}>{m.statut}</Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button className="text-primary-600 hover:text-primary-800 font-medium text-xs" onClick={e => { e.stopPropagation(); navigate(`/members/${m.id}`) }}>
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Ajouter un membre" className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénoms" value={form.prenoms} onChange={e => setForm({ ...form, prenoms: e.target.value })} required />
          </div>
          <Input label="Téléphone" type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} required placeholder="+225 01 02 03 04 05" />
          <Input label="Adresse" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Sexe" value={form.sexe} onChange={e => setForm({ ...form, sexe: e.target.value })} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }]} required />
            <Input label="Date de naissance" type="date" value={form.date_naissance} onChange={e => setForm({ ...form, date_naissance: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date d'adhésion" type="date" value={form.date_adhesion} onChange={e => setForm({ ...form, date_adhesion: e.target.value })} required />
            <Input label="Fonction / Rôle" value={form.fonction} onChange={e => setForm({ ...form, fonction: e.target.value })} />
          </div>
          <Select label="Statut" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} options={[{ value: 'Actif', label: 'Actif' }, { value: 'Inactif', label: 'Inactif' }]} required />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={createMember.isPending}>Ajouter le membre</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
