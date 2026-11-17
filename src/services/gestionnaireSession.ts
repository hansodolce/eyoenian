import type { SupabaseClient } from '@supabase/supabase-js'

type SessionAuth = Pick<SupabaseClient['auth'], 'getSession' | 'signInAnonymously'>

// Le profil téléphone/PIN et la session Supabase sont stockés séparément.
// Une session Supabase est nécessaire pour appeler les fonctions protégées.
export async function ensureGestionnaireSession(auth: SessionAuth) {
  const { data: { session }, error: sessionError } = await auth.getSession()
  if (sessionError) {
    throw new Error(`Impossible de vérifier la session : ${sessionError.message}`)
  }
  if (session) return

  const { data, error } = await auth.signInAnonymously()
  if (error) {
    if (error.code === 'anonymous_provider_disabled') {
      throw new Error('La connexion des gestionnaires nécessite l’activation des connexions anonymes dans Supabase (Authentication > Sign In / Providers > Anonymous Sign-Ins).')
    }
    throw new Error(`Impossible de rétablir la session : ${error.message}`)
  }
  if (!data.session) {
    throw new Error('La session n’a pas pu être rétablie. Réessayez dans quelques instants.')
  }
}
