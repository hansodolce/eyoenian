import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardBody, CardHeader, Badge, LoadingSpinner, EmptyState, PageHeader, Select } from '@/components/ui'
import { useMeetings, useMembers, useAttendances } from '@/services/queries'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/utils'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function PresencesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const meetingIdParam = searchParams.get('meeting')
  const { data: meetings } = useMeetings()
  const { data: members } = useMembers()
  const { data: attendances } = useAttendances(meetingIdParam || undefined)
  const queryClient = useQueryClient()

  const [selectedMeeting, setSelectedMeeting] = useState(meetingIdParam || '')
  const [localAttendances, setLocalAttendances] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (meetingIdParam) setSelectedMeeting(meetingIdParam)
  }, [meetingIdParam])

  useEffect(() => {
    if (attendances) {
      const map: Record<string, string> = {}
      attendances.forEach(a => { map[a.member_id] = a.statut })
      setLocalAttendances(map)
    }
  }, [attendances])

  function handleMeetingChange(meetingId: string) {
    setSelectedMeeting(meetingId)
    if (meetingId) setSearchParams({ meeting: meetingId })
    else setSearchParams({})
  }

  async function toggleAttendance(memberId: string) {
    const current = localAttendances[memberId]
    const next = current === 'Présent' ? 'Absent' : current === 'Absent' ? 'Excusé' : 'Présent'
    setLocalAttendances(prev => ({ ...prev, [memberId]: next }))

    if (!selectedMeeting) return
    try {
      const existing = attendances?.find(a => a.member_id === memberId && a.meeting_id === selectedMeeting)
      if (existing) {
        await supabase.from('attendances').update({ statut: next }).eq('id', existing.id)
      } else {
        await supabase.from('attendances').insert({ meeting_id: selectedMeeting, member_id: memberId, statut: next })
      }
      queryClient.invalidateQueries({ queryKey: ['attendances'] })
    } catch (err: any) {
      toast.error(err.message)
      setLocalAttendances(prev => ({ ...prev, [memberId]: current }))
    }
  }

  const activeMembers = (members || []).filter(m => m.statut === 'Actif')
  const meeting = (meetings || []).find(m => m.id === selectedMeeting)
  const isPast = meeting ? new Date(meeting.date + 'T' + meeting.heure) < new Date() : false

  const stats = {
    presents: Object.values(localAttendances).filter(s => s === 'Présent').length,
    absents: Object.values(localAttendances).filter(s => s === 'Absent').length,
    excuses: Object.values(localAttendances).filter(s => s === 'Excusé').length,
    nonMarques: activeMembers.length - Object.keys(localAttendances).length,
  }

  const filteredMembers = activeMembers.filter(m => {
    if (!filter) return true
    if (filter === 'present') return localAttendances[m.id] === 'Présent'
    if (filter === 'absent') return localAttendances[m.id] === 'Absent'
    if (filter === 'excusé') return localAttendances[m.id] === 'Excusé'
    return true
  })

  async function finalizeAbsences() {
    if (!selectedMeeting || !meeting) return
    const toInsert = activeMembers
      .filter(m => !localAttendances[m.id])
      .map(m => ({ meeting_id: selectedMeeting, member_id: m.id, statut: 'Absent' as const }))
    if (toInsert.length === 0) { toast.success('Tous les membres ont déjà un statut'); return }
    try {
      const { error } = await supabase.from('attendances').insert(toInsert)
      if (error) throw error
      toast.success(`${toInsert.length} membre(s) marqué(s) absent(s)`)
      queryClient.invalidateQueries({ queryKey: ['attendances'] })
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Présences" subtitle="Gérez les présences aux réunions" />

      <Card>
        <CardBody>
          <Select
            label="Sélectionner une réunion"
            value={selectedMeeting}
            onChange={e => handleMeetingChange(e.target.value)}
            options={(meetings || []).map(m => ({
              value: m.id,
              label: `${m.objet} - ${new Date(m.date).toLocaleDateString('fr-FR')} à ${m.heure}`
            }))}
            placeholder="Choisir une réunion..."
          />
        </CardBody>
      </Card>

      {selectedMeeting && meeting && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{stats.presents}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Présents</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.absents}</p>
              <p className="text-xs text-red-600 font-medium mt-1">Absents</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.excuses}</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Excusés</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-secondary-700">{stats.nonMarques}</p>
              <p className="text-xs text-secondary-600 font-medium mt-1">Non marqués</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-secondary-900">{meeting.objet}</h3>
                  <p className="text-sm text-secondary-500">
                    {new Date(meeting.date).toLocaleDateString('fr-FR')} à {meeting.heure} — {meeting.lieu}
                  </p>
                  {isPast && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600 font-medium">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01" /><circle cx="12" cy="12" r="10" /></svg>
                      Réunion passée — présences verrouillées
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {['', 'present', 'absent', 'excusé'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f === filter ? '' : f)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        filter === f ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                      }`}
                    >
                      {f ? (f === 'present' ? 'Présent' : f === 'absent' ? 'Absent' : 'Excusé') : 'Tous'}
                    </button>
                  ))}
                  {isPast && stats.nonMarques > 0 && (
                    <button onClick={finalizeAbsences} className="px-3 py-1.5 text-xs rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                      Finaliser absents
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {filteredMembers.map(m => {
                  const status = localAttendances[m.id] || 'Absent'
                  return (
                    <button
                      key={m.id}
                      disabled={isPast}
                      onClick={() => toggleAttendance(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all disabled:cursor-not-allowed ${
                        isPast ? 'opacity-70' : ''
                      } ${
                        status === 'Présent' ? 'bg-emerald-50 border-emerald-300 shadow-sm' :
                        status === 'Excusé' ? 'bg-amber-50 border-amber-300 shadow-sm' :
                        'bg-white border-secondary-200 hover:bg-secondary-50 hover:border-secondary-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        status === 'Présent' ? 'bg-emerald-200 text-emerald-800' :
                        status === 'Excusé' ? 'bg-amber-200 text-amber-800' :
                        'bg-secondary-200 text-secondary-600'
                      }`}>
                        {getInitials(m.nom, m.prenoms)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 truncate">{m.prenoms} {m.nom}</p>
                      </div>
                      <Badge variant={status === 'Présent' ? 'success' : status === 'Excusé' ? 'warning' : 'error'} className="flex-shrink-0 hidden sm:inline-flex">
                        {status}
                      </Badge>
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 sm:hidden ${
                        status === 'Présent' ? 'bg-emerald-500' :
                        status === 'Excusé' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                    </button>
                  )
                })}
              </div>

              {filteredMembers.length === 0 && (
                <EmptyState title="Aucun membre" description="Aucun membre ne correspond à ce filtre" />
              )}
            </CardBody>
          </Card>
        </>
      )}

      {selectedMeeting && !meeting && <LoadingSpinner />}
      {!selectedMeeting && (
        <EmptyState
          title="Sélectionnez une réunion"
          description="Choisissez une réunion dans la liste ci-dessus pour gérer les présences"
        />
      )}
    </div>
  )
}
