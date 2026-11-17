import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ensureGestionnaireSession } from '../src/services/gestionnaireSession.ts'

test('conserve une session existante sans créer un autre utilisateur', async () => {
  await ensureGestionnaireSession({
    getSession: async () => ({ data: { session: { access_token: 'existing' } }, error: null }),
    signInAnonymously: async () => assert.fail('La session existante doit être conservée'),
  })
})

test('attend la création de la session avant de permettre la modification du PIN', async () => {
  let restored = false
  await ensureGestionnaireSession({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      restored = true
      return { data: { session: { access_token: 'restored' } }, error: null }
    },
  })
  assert.equal(restored, true)
})

test('explique la configuration manquante quand les connexions anonymes sont désactivées', async () => {
  await assert.rejects(ensureGestionnaireSession({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => ({
      data: { session: null },
      error: { code: 'anonymous_provider_disabled', message: 'Anonymous sign-ins are disabled' },
    }),
  }), /activation des connexions anonymes/)
})

test('ne considère pas la connexion comme réussie en cas d’erreur réseau', async () => {
  await assert.rejects(ensureGestionnaireSession({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => ({ data: { session: null }, error: { message: 'Failed to fetch' } }),
  }), /Impossible de rétablir la session : Failed to fetch/)
})

test('refuse une réponse de connexion sans session', async () => {
  await assert.rejects(ensureGestionnaireSession({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => ({ data: { session: null }, error: null }),
  }), /session n’a pas pu être rétablie/)
})

test('signale les erreurs de lecture ou de renouvellement de session', async () => {
  await assert.rejects(ensureGestionnaireSession({
    getSession: async () => ({ data: { session: null }, error: { message: 'Refresh failed' } }),
    signInAnonymously: async () => assert.fail('Ne pas masquer une erreur de renouvellement'),
  }), /Impossible de vérifier la session : Refresh failed/)
})
