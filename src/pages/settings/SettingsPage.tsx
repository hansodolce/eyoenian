import { useState, useEffect, type FormEvent } from 'react'
import { Card, CardBody, CardHeader, Button, Input, LoadingSpinner, PageHeader } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({ nom: 'Eyo-Enian', adresse: '', telephone: '', email: '' })

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      try {
        const { data, error } = await supabase.from('settings').select('key, value')
          .in('key', ['nom', 'adresse', 'telephone', 'email'])
        if (error) throw new Error(error.message)
        if (data && !cancelled) {
          const map: Record<string, string> = {}
          data.forEach(s => { map[s.key] = s.value })
          setSettings({ nom: map.nom || 'Eyo-Enian', adresse: map.adresse || '', telephone: map.telephone || '', email: map.email || '' })
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Impossible de charger les paramètres')
      } finally { if (!cancelled) setLoading(false) }
    }
    void loadSettings()
    return () => { cancelled = true }
  }, [])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (saving || loadError) return
    setSaving(true)
    try {
      const { error } = await supabase.from('settings').upsert(
        Object.entries(settings).map(([key, value]) => ({ key, value: value.trim() })),
        { onConflict: 'key' },
      )
      if (error) throw new Error(error.message)
      toast.success('Paramètres enregistrés avec succès')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Impossible d’enregistrer les paramètres') }
    finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Paramètres" subtitle="Configuration de l'association" />
      {loadError && <p role="alert" className="text-sm text-error">{loadError}</p>}
      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader><h3 className="font-semibold text-secondary-900">Informations générales</h3></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Nom de l'association" value={settings.nom} onChange={e => setSettings({ ...settings, nom: e.target.value })} required disabled={saving || !!loadError} />
            <Input label="Adresse" value={settings.adresse} onChange={e => setSettings({ ...settings, adresse: e.target.value })} disabled={saving || !!loadError} />
            <Input label="Téléphone" type="tel" value={settings.telephone} onChange={e => setSettings({ ...settings, telephone: e.target.value })} disabled={saving || !!loadError} />
            <Input label="Email" type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} disabled={saving || !!loadError} />
          </CardBody>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!!loadError} className="px-8">Enregistrer les modifications</Button>
        </div>
      </form>
    </div>
  )
}
