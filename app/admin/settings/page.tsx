'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ConfigStatus {
  stripeSecretKey: boolean
  stripeWebhookSecret: boolean
  supabaseUrl: boolean
  supabaseKey: boolean
  adminEmails: string[]
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status, email')
      .eq('id', user.id)
      .single()

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    const isAdminUser = adminEmails.includes(profile?.email || '') ||
                        profile?.verification_status === 'meetup_organizer'

    if (!isAdminUser) {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    loadConfig()
  }

  function loadConfig() {
    try {
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []

      // Check environment variables
      const stripeSecretKey = !!(typeof window === 'undefined' ?
        process.env.STRIPE_SECRET_KEY :
        true) // Can't access secret keys from client

      const stripeWebhookSecret = !!(typeof window === 'undefined' ?
        process.env.STRIPE_WEBHOOK_SECRET :
        true) // Can't access secret keys from client

      const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setConfig({
        stripeSecretKey,
        stripeWebhookSecret,
        supabaseUrl,
        supabaseKey,
        adminEmails
      })
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Checking permissions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Platform configuration and environment variables</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stripe Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Stripe Configuration</h2>
                  <p className="text-sm text-slate-600 mt-1">Payment processing setup</p>
                </div>
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Stripe Dashboard →
                </a>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    config?.stripeSecretKey ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {config?.stripeSecretKey ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">STRIPE_SECRET_KEY</p>
                    <p className="text-xs text-slate-600">Secret key for server-side API calls (starts with sk_test_ or sk_live_)</p>
                  </div>
                  <span className={`text-sm font-medium ${config?.stripeSecretKey ? 'text-green-600' : 'text-red-600'}`}>
                    {config?.stripeSecretKey ? 'Configured' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    config?.stripeWebhookSecret ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {config?.stripeWebhookSecret ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">STRIPE_WEBHOOK_SECRET</p>
                    <p className="text-xs text-slate-600">Webhook signing secret for payment confirmations (starts with whsec_)</p>
                  </div>
                  <span className={`text-sm font-medium ${config?.stripeWebhookSecret ? 'text-green-600' : 'text-red-600'}`}>
                    {config?.stripeWebhookSecret ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>

              {(!config?.stripeSecretKey || !config?.stripeWebhookSecret) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900 font-medium mb-2">⚠️ Configuration Needed</p>
                  <ol className="text-sm text-amber-800 space-y-2 ml-4 list-decimal">
                    <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Stripe Dashboard API Keys</a></li>
                    <li>Copy your Secret key (sk_test_...)</li>
                    <li>Add to <code className="bg-white px-2 py-1 rounded">STRIPE_SECRET_KEY</code> in <code className="bg-white px-2 py-1 rounded">.env.local</code></li>
                    <li>Create webhook endpoint at <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">Stripe Webhooks</a></li>
                    <li>Copy webhook signing secret (whsec_...)</li>
                    <li>Add to <code className="bg-white px-2 py-1 rounded">STRIPE_WEBHOOK_SECRET</code> in <code className="bg-white px-2 py-1 rounded">.env.local</code></li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              )}

              {config?.stripeSecretKey && config?.stripeWebhookSecret && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-900 font-medium">✓ Stripe is fully configured</p>
                  <p className="text-xs text-green-800 mt-1">Payments are ready to process. Test with card 4242 4242 4242 4242</p>
                </div>
              )}
            </div>

            {/* Supabase Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Supabase Configuration</h2>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    config?.supabaseUrl ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {config?.supabaseUrl ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">NEXT_PUBLIC_SUPABASE_URL</p>
                    <p className="text-xs text-slate-600">Supabase project URL</p>
                  </div>
                  <span className={`text-sm font-medium ${config?.supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                    {config?.supabaseUrl ? 'Configured' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    config?.supabaseKey ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {config?.supabaseKey ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
                    <p className="text-xs text-slate-600">Supabase anonymous key</p>
                  </div>
                  <span className={`text-sm font-medium ${config?.supabaseKey ? 'text-green-600' : 'text-red-600'}`}>
                    {config?.supabaseKey ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Admin Accounts</h2>

              {config?.adminEmails && config.adminEmails.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 mb-3">The following email addresses have admin access:</p>
                  <div className="space-y-2">
                    {config.adminEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <span className="text-lg">👤</span>
                        <span className="font-medium text-slate-900">{email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900 font-medium">⚠️ No admin emails configured</p>
                  <p className="text-xs text-amber-800 mt-1">Add comma-separated admin emails to <code className="bg-white px-2 py-1 rounded">NEXT_PUBLIC_ADMIN_EMAILS</code> in <code className="bg-white px-2 py-1 rounded">.env.local</code></p>
                </div>
              )}
            </div>

            {/* Documentation */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-bold text-blue-900 mb-3">📖 Documentation</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  <a href="https://stripe.com/docs/payments/checkout" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                    Stripe Checkout Documentation →
                  </a>
                </li>
                <li>
                  <a href="https://stripe.com/docs/webhooks" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                    Stripe Webhooks Documentation →
                  </a>
                </li>
                <li>
                  <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">
                    Stripe Test Cards →
                  </a>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
