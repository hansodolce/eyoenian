import { useState } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Badge, LoadingSpinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/utils'

export function ConsultationPage() {
  const [step, setStep] = useState<'form' | 'result'>('form')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [memberData, setMemberData] = useState<any>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'pin_global')
        .single()

      if (!settings || settings.value !== pin) {
        throw new Error('PIN global incorrect')
      }

      const { data: member, error: mError } = await supabase
        .from('members')
        .select('*')
        .eq('telephone', phone)
        .single()

      if (mError || !member) {
        throw new Error('Aucun membre trouvé avec ce numéro')
      }

      const { data: annualP } = await supabase
        .from('annual_payments')
        .select('*, contribution:annual_contributions(*)')
        .eq('member_id', member.id)
        .eq('statut', 'Confirmé')

      const { data: specialP } = await supabase
        .from('special_payments')
        .select('*, contribution:special_contributions(*)')
        .eq('member_id', member.id)
        .eq('statut', 'Confirmé')

      const { data: attendances } = await supabase
        .from('attendances')
        .select('*')
        .eq('member_id', member.id)

      setMemberData({
        member,
        annualPayments: annualP || [],
        specialPayments: specialP || [],
        attendances: attendances || [],
      })
      setStep('result')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep('form')
    setPhone('')
    setPin('')
    setMemberData(null)
    setError('')
  }

  if (step === 'result' && memberData) {
    const { member, annualPayments, specialPayments, attendances } = memberData
    const totalPaid = [...annualPayments, ...specialPayments].reduce((s: number, p: any) => s + Number(p.montant), 0)
    const presences = attendances.filter((a: any) => a.statut === 'Présent').length

    return (
      <div className="min-h-screen bg-secondary-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {member.nom.charAt(0)}{member.prenoms.charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-secondary-900">{member.prenoms} {member.nom}</h1>
            <p className="text-secondary-500">{member.fonction || 'Membre'}</p>
            <Badge variant={member.statut === 'Actif' ? 'success' : 'error'} className="mt-2">{member.statut}</Badge>
          </div>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-secondary-900 mb-3">Informations personnelles</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-secondary-500">Téléphone</span>
                  <span className="text-sm font-medium">{member.telephone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-secondary-500">Sexe</span>
                  <span className="text-sm font-medium">{member.sexe === 'M' ? 'Homme' : 'Femme'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-100">
                  <span className="text-sm text-secondary-500">Adhésion</span>
                  <span className="text-sm font-medium">{formatDate(member.date_adhesion)}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-secondary-900 mb-3">Situation financière</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-emerald-600">Total payé</p>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-primary-700">{formatCurrency(totalPaid)}</p>
                  <p className="text-xs text-primary-600">Solde</p>
                </div>
              </div>

              {annualPayments.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-secondary-700 mb-2">Cotisations annuelles</h4>
                  {annualPayments.map((p: any) => (
                    <div key={p.id} className="flex justify-between py-2 border-b border-secondary-100">
                      <span className="text-sm">{p.contribution?.annee || 'N/A'}</span>
                      <span className="text-sm font-medium text-emerald-600">{formatCurrency(p.montant)}</span>
                    </div>
                  ))}
                </>
              )}

              {specialPayments.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-secondary-700 mt-4 mb-2">Cotisations exceptionnelles</h4>
                  {specialPayments.map((p: any) => (
                    <div key={p.id} className="flex justify-between py-2 border-b border-secondary-100">
                      <span className="text-sm">{p.contribution?.titre || 'N/A'}</span>
                      <span className="text-sm font-medium text-emerald-600">{formatCurrency(p.montant)}</span>
                    </div>
                  ))}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-secondary-900 mb-3">Présences</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-700">{presences}</p>
                  <p className="text-xs text-emerald-600">Présent</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-700">{attendances.filter((a: any) => a.statut === 'Absent').length}</p>
                  <p className="text-xs text-red-600">Absent</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-700">{attendances.filter((a: any) => a.statut === 'Excusé').length}</p>
                  <p className="text-xs text-amber-600">Excusé</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="text-center">
            <Button variant="secondary" onClick={handleReset}>Consulter un autre membre</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">Eyo-Enian</h1>
          <p className="text-secondary-500 mt-1">Consultation membre</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <svg className="w-24 h-24 text-secondary-300 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v4l2 2" />
                  <path d="M8 4V2M16 4V2M4 8h16" />
                </svg>
                <p className="text-sm text-secondary-500 mt-2">Scannez le QR Code ou saisissez vos informations</p>
              </div>

              <Input label="Numéro de téléphone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+225 01 02 03 04 05" required />
              <Input label="PIN global" type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" maxLength={4} required />

              {error && <p className="text-sm text-error bg-red-50 p-3 rounded-lg">{error}</p>}

              <Button type="submit" loading={loading} className="w-full">Consulter mes informations</Button>
            </form>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-secondary-400 mt-4">
          Cette page est accessible à tous les membres de l'association
        </p>
      </div>
    </div>
  )
}
