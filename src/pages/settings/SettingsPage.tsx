import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Input, LoadingSpinner, PageHeader } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    nom: 'Eyo-Enian',
    adresse: '',
    telephone: '',
    email: '',
    pin_global: '',
  })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach(s => { map[s.key] = s.value })
        setSettings(prev => ({
          nom: map.nom || prev.nom,
          adresse: map.adresse || '',
          telephone: map.telephone || '',
          email: map.email || '',
          pin_global: map.pin_global || '',
        }))
      }
    } catch (err) { /* ignore */ }
    finally { setLoading(false) }
  }

  async function saveSetting(key: string, value: string) {
    const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle()
    if (existing) await supabase.from('settings').update({ value }).eq('key', key)
    else await supabase.from('settings').insert({ key, value })
  }

  async function handleSave() {
    if (profile?.role !== 'admin') { toast.error('Seul l\'administrateur peut modifier les paramètres'); return }
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(settings)) { await saveSetting(key, value) }
      toast.success('Paramètres enregistrés avec succès')
    } catch (err: any) { toast.error(err.message || 'Erreur') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Paramètres" subtitle="Configuration de l'association" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="font-semibold text-secondary-900">Informations générales</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input label="Nom de l'association" value={settings.nom} onChange={e => setSettings({ ...settings, nom: e.target.value })} />
            <Input label="Adresse" value={settings.adresse} onChange={e => setSettings({ ...settings, adresse: e.target.value })} />
            <Input label="Téléphone" type="tel" value={settings.telephone} onChange={e => setSettings({ ...settings, telephone: e.target.value })} />
            <Input label="Email" type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="font-semibold text-secondary-900">Sécurité</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input label="PIN global de l'association" type="password" value={settings.pin_global} onChange={e => setSettings({ ...settings, pin_global: e.target.value })} maxLength={4} />
            <div className="p-4 bg-amber-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-amber-800">Le PIN global est utilisé par les membres pour consulter leurs informations via QR Code. Ce code doit être communiqué uniquement aux membres de l'association.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="px-8">
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  )
}
