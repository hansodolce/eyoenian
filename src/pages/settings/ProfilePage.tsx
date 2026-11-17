import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Card, CardBody, CardHeader, Input, PageHeader } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export function ProfilePage() {
  const { profile, isGestionnaire, updateProfile, updatePassword } = useAuth()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [profilePin, setProfilePin] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const busy = savingProfile || savingPassword

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setSavingProfile(true)
    try {
      await updateProfile(fullName, phone, profilePin)
      setProfilePin('')
      void queryClient.invalidateQueries({ queryKey: ['gestionnaires'] })
      toast.success('Profil mis à jour')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de modifier le profil')
    } finally { setSavingProfile(false) }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (newPassword !== confirmation) {
      toast.error('La confirmation ne correspond pas')
      return
    }
    setSavingPassword(true)
    try {
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setProfilePin('')
      void queryClient.invalidateQueries({ queryKey: ['gestionnaires'] })
      toast.success(isGestionnaire ? 'Code PIN modifié' : 'Mot de passe modifié')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de modifier le code de connexion')
    } finally { setSavingPassword(false) }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles et votre connexion" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader><h3 className="font-semibold text-secondary-900">Informations personnelles</h3></CardHeader>
          <CardBody>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Input label="Nom complet" name="full_name" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={busy} />
              <Input label="Téléphone" name="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required={isGestionnaire} disabled={busy} />
              {profile?.email && <Input label="Email de connexion" type="email" value={profile.email} disabled />}
              <p className="text-sm text-secondary-500">Compte : {isGestionnaire ? 'Gestionnaire' : 'Administrateur'}</p>
              {isGestionnaire && <Input label="PIN actuel pour confirmer" type="password" value={profilePin} onChange={e => setProfilePin(e.target.value)} maxLength={4} required disabled={busy} />}
              <Button type="submit" loading={savingProfile} disabled={busy}>Enregistrer le profil</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h3 className="font-semibold text-secondary-900">{isGestionnaire ? 'Modifier mon PIN' : 'Modifier mon mot de passe'}</h3></CardHeader>
          <CardBody>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <p className="text-sm text-secondary-500">{isGestionnaire ? 'Choisissez un code PIN de 4 chiffres.' : 'Choisissez un mot de passe d’au moins 8 caractères.'}</p>
              <Input label={isGestionnaire ? 'PIN actuel' : 'Mot de passe actuel'} type="password" name="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} maxLength={isGestionnaire ? 4 : undefined} required disabled={busy} />
              <Input label={isGestionnaire ? 'Nouveau PIN' : 'Nouveau mot de passe'} type="password" name="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} maxLength={isGestionnaire ? 4 : undefined} required disabled={busy} />
              <Input label={isGestionnaire ? 'Confirmer le nouveau PIN' : 'Confirmer le nouveau mot de passe'} type="password" name="confirm-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} maxLength={isGestionnaire ? 4 : undefined} required disabled={busy} />
              <Button type="submit" loading={savingPassword} disabled={busy}>{isGestionnaire ? 'Modifier le PIN' : 'Modifier le mot de passe'}</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
