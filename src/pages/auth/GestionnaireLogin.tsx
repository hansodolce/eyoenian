import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

export function GestionnaireLogin() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithPin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithPin(phone, pin)
      toast.success('Connexion réussie')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Numéro ou PIN incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">Eyo-Enian</h1>
          <p className="text-secondary-500 mt-1">Espace Gestionnaire</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-secondary-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Numéro de téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="+225 01 02 03 04 05"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Code PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="••••"
              maxLength={4}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <div className="text-center space-y-2">
            <p className="text-sm text-secondary-500">
              <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">Connexion administrateur</a>
            </p>
            <p className="text-sm text-secondary-500">
              <a href="/consultation" className="text-primary-600 hover:text-primary-700 font-medium">Consultation membre</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
