import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureGestionnaireSession } from '@/services/gestionnaireSession'
import type { Profile, UserRole } from '@/types'

interface AuthContextType {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithPin: (phone: string, pin: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (fullName: string, phone: string, currentPin?: string) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  isAdmin: boolean
  isGestionnaire: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'eyo_profile'

function restoreProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function persistProfile(p: Profile | null) {
  if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(restoreProfile)
  const [loading, setLoading] = useState(!restoreProfile())

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        const stored = restoreProfile()
        if (stored) {
          setProfile(stored)
          setLoading(false)
        } else {
          setLoading(false)
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else {
        const stored = restoreProfile()
        setProfile(stored)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (data) setProfile(data as Profile)
    else {
      const stored = restoreProfile()
      if (stored) setProfile(stored)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) await fetchProfile(data.user.id)
  }

  async function signInWithPin(phone: string, pin: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .eq('role', 'gestionnaire')
      .maybeSingle()
    if (!profile) throw new Error('Numéro ou PIN incorrect')
    if (!profile.is_active) throw new Error('Compte désactivé')
    if (profile.pin !== pin) {
      const { data: members } = await supabase
        .from('members')
        .select('id, nom, prenoms')
        .eq('telephone', phone)
        .maybeSingle()
      if (!members) throw new Error('Numéro ou PIN incorrect')
      const memberProfile: Profile = {
        id: members.id,
        phone,
        full_name: `${members.prenoms} ${members.nom}`,
        role: 'member' as UserRole,
        is_active: true,
        created_at: new Date().toISOString()
      }
      persistProfile(memberProfile)
      setProfile(memberProfile)
      return
    }
    await ensureGestionnaireSession(supabase.auth)
    persistProfile(profile as Profile)
    setProfile(profile as Profile)
  }

  async function signOut() {
    await supabase.auth.signOut()
    persistProfile(null)
    setProfile(null)
  }

  function saveProfile(updated: Profile) {
    persistProfile(updated)
    setProfile(updated)
  }

  async function updateProfile(fullName: string, phone: string, currentPin?: string) {
    if (!profile) throw new Error('Veuillez vous reconnecter')
    if (!fullName.trim()) throw new Error('Le nom est obligatoire')
    if (profile.role === 'gestionnaire') {
      if (!phone.trim()) throw new Error('Le téléphone est obligatoire')
      await ensureGestionnaireSession(supabase.auth)
      const { data, error } = await supabase.rpc('update_own_gestionnaire', {
        p_id: profile.id, p_current_pin: currentPin || '',
        p_full_name: fullName.trim(), p_phone: phone.trim(),
      })
      if (error) throw new Error(error.message)
      saveProfile(data as Profile)
    } else {
      const { data, error } = await supabase.from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id).select('*').single()
      if (error) throw new Error(error.code === '23505' ? 'Ce téléphone est déjà utilisé par un autre compte' : error.message)
      saveProfile(data as Profile)
    }
  }

  async function updatePassword(currentPassword: string, newPassword: string) {
    if (!profile) throw new Error('Veuillez vous reconnecter')
    if (!currentPassword) throw new Error('Saisissez votre code actuel')
    if (currentPassword === newPassword) throw new Error('Le nouveau code doit être différent du précédent')
    if (profile.role === 'gestionnaire') {
      if (!/^\d{4}$/.test(newPassword)) throw new Error('Le PIN doit contenir exactement 4 chiffres')
      await ensureGestionnaireSession(supabase.auth)
      const { data, error } = await supabase.rpc('update_own_gestionnaire', {
        p_id: profile.id, p_current_pin: currentPassword, p_new_pin: newPassword,
      })
      if (error) throw new Error(error.message)
      saveProfile(data as Profile)
      return
    }
    if (newPassword.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.email || user.id !== profile.id || user.is_anonymous) {
      throw new Error('Veuillez vous reconnecter pour modifier votre mot de passe')
    }
    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: user.email, password: currentPassword,
    })
    if (verificationError) throw new Error('Mot de passe actuel incorrect ou connexion impossible')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      profile,
      loading,
      signIn,
      signInWithPin,
      signOut,
      updateProfile,
      updatePassword,
      isAdmin: profile?.role === 'admin',
      isGestionnaire: profile?.role === 'gestionnaire'
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
