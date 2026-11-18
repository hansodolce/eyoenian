import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let supabase
const requests = []
const originalFetch = globalThis.fetch
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

before(async () => {
  // Un ancien profil ou jeton ne doit plus intervenir dans les requêtes.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => assert.fail('Le client sans authentification ne doit pas lire une ancienne session'),
      setItem: () => assert.fail('Aucune session ne doit être enregistrée'),
      removeItem: () => {},
    },
  })
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options })
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    envFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://example.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-public-key'),
    },
  })
  ;({ supabase } = await server.ssrLoadModule('/src/lib/supabase.ts'))
})

after(async () => {
  await server?.close()
  globalThis.fetch = originalFetch
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

test('charge les membres avec la clé publique, sans requête de connexion', async () => {
  requests.length = 0
  const { error } = await supabase.from('members').select('id')
  assert.equal(error, null)
  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/rest\/v1\/members\?/)
  const headers = new Headers(requests[0].options.headers)
  assert.equal(headers.get('apikey'), 'test-public-key')
  assert.equal(headers.get('authorization'), 'Bearer test-public-key')
})

test('enregistre les paramètres sans identité utilisateur ni renouvellement de session', async () => {
  requests.length = 0
  const { error } = await supabase.from('settings').upsert([{ key: 'nom', value: 'Association' }], { onConflict: 'key' })
  assert.equal(error, null)
  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/rest\/v1\/settings\?/)
  assert.equal(requests[0].options.method, 'POST')
  assert.equal(new Headers(requests[0].options.headers).get('authorization'), 'Bearer test-public-key')
})
