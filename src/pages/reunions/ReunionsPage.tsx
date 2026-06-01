import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, Button, Modal, Input, LoadingSpinner, EmptyState, PageHeader } from '@/components/ui'
import { useMeetings, useAttendances } from '@/services/queries'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function ReunionsPage() {
  const { data: meetings, isLoading } = useMeetings()
  const { data: attendances } = useAttendances()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], heure: '10:00', lieu: '', objet: '', observation: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('meetings').insert(form)
      if (error) throw error
      toast.success('Réunion planifiée avec succès')
      setShowModal(false)
      setForm({ date: new Date().toISOString().split('T')[0], heure: '10:00', lieu: '', objet: '', observation: '' })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  if (isLoading) return <LoadingSpinner />

  const pastMeetings = (meetings || []).filter(m => new Date(`${m.date}T${m.heure}`) < new Date())
  const upcomingMeetings = (meetings || []).filter(m => new Date(`${m.date}T${m.heure}`) >= new Date())

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Réunions"
        subtitle={meetings ? `${meetings.length} réunion${meetings.length > 1 ? 's' : ''} planifiée${meetings.length > 1 ? 's' : ''}` : ''}
      >
        <Button onClick={() => setShowModal(true)}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          <span className="hidden sm:inline">Planifier une réunion</span>
          <span className="sm:hidden">Planifier</span>
        </Button>
      </PageHeader>

      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-3">À venir</h3>
          <div className="grid gap-3">
            {upcomingMeetings.map(m => (
              <MeetingCard key={m.id} meeting={m} onPresences={() => navigate(`/presences?meeting=${m.id}`)} />
            ))}
          </div>
        </div>
      )}

      {pastMeetings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-3">Passées</h3>
          <div className="grid gap-3">
            {pastMeetings.map(m => (
              <MeetingCard key={m.id} meeting={m} onPresences={() => navigate(`/presences?meeting=${m.id}`)} />
            ))}
          </div>
        </div>
      )}

      {(!meetings || meetings.length === 0) && (
        <EmptyState
          title="Aucune réunion"
          description="Planifiez votre première réunion"
          action={<Button onClick={() => setShowModal(true)}>Planifier une réunion</Button>}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Planifier une réunion">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            <Input label="Heure" type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} required />
          </div>
          <Input label="Lieu" value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} required />
          <Input label="Objet" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} required />
          <Input label="Observation" value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={loading}>Planifier la réunion</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function MeetingCard({ meeting: m, onPresences }: { meeting: any; onPresences: () => void }) {
  const isPast = new Date(`${m.date}T${m.heure}`) < new Date()
  const allAttendances = useAttendances()
  const meetingAttendances = isPast ? (allAttendances.data || []).filter(a => a.meeting_id === m.id) : []
  const unmarked = isPast && meetingAttendances.length === 0
  return (
    <Card className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-75' : ''}`}>
      <CardBody>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${isPast ? 'bg-secondary-300' : 'bg-emerald-500'}`} />
              <h3 className="font-semibold text-secondary-900 truncate">{m.objet}</h3>
              {isPast && <span className="text-xs text-secondary-400 font-medium">Passée</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-2 text-sm text-secondary-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-secondary-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {formatDate(m.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-secondary-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                {m.heure}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-secondary-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="truncate max-w-[150px]">{m.lieu}</span>
              </span>
              {isPast && meetingAttendances.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium">
                  <span className="text-emerald-600">{meetingAttendances.filter(a => a.statut === 'Présent').length}P</span>
                  <span className="text-red-600">{meetingAttendances.filter(a => a.statut === 'Absent').length}A</span>
                  <span className="text-amber-600">{meetingAttendances.filter(a => a.statut === 'Excusé').length}E</span>
                </span>
              )}
            </div>
            {m.observation && <p className="text-sm text-secondary-400 mt-2 italic">&quot;{m.observation}&quot;</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant={unmarked ? 'primary' : 'secondary'} onClick={onPresences}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {isPast ? 'Voir' : 'Présences'}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
