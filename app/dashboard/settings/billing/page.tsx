'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BillingProfile {
  subscription_tier: string
  subscription_status: string
  subscription_started_at: string | null
  subscription_ends_at: string | null
  subscription_cancelled_at: string | null
  auto_renew: boolean
  stripe_customer_id: string | null
}

export default function BillingPage() {
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabaseRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabaseRef.current = createClient()
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabaseRef.current.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    loadProfile(user.id)
  }

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabaseRef.current
        .from('profiles')
        .select(
          'subscription_tier, subscription_status, subscription_started_at, subscription_ends_at, subscription_cancelled_at, auto_renew, stripe_customer_id'
        )
        .eq('id', userId)
        .single()

      if (error) throw error

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage({ type: 'error', text: 'Failed to load billing information' })
    } finally {
      setLoading(false)
    }
  }

  async function handleManageSubscription() {
    setLoadingPortal(true)
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/subscriptions/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: 'Failed to open billing portal' })
      }
    } catch (error) {
      console.error('Error accessing portal:', error)
      setMessage({ type: 'error', text: 'Failed to open billing portal' })
    } finally {
      setLoadingPortal(false)
    }
  }

  async function handleUpgrade() {
    const { data: { user } } = await supabaseRef.current.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    router.push('/pricing')
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading billing information...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Could not load billing information</p>
      </div>
    )
  }

  const isPremium = profile.subscription_tier === 'premium'
  const isActive = profile.subscription_status === 'active'
  const isPastDue = profile.subscription_status === 'past_due'
  const isCancelled = profile.subscription_status === 'cancelled'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/settings" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Settings
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Billing & Subscription</h1>
          <p className="text-slate-600">Manage your subscription and payment methods</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Current Plan</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Plan Info */}
            <div>
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-1">Plan Type</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-bold text-slate-900">
                    {isPremium ? 'Premium' : 'Free'}
                  </h3>
                  {isPremium && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-green-100 text-green-800'
                        : isPastDue
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {isActive ? 'Active' : isPastDue ? 'Past Due' : 'Cancelled'}
                    </span>
                  )}
                </div>
              </div>

              {isPremium && (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-sm text-slate-600">Price</p>
                      <p className="text-lg font-semibold text-slate-900">$29 per year</p>
                    </div>

                    {profile.subscription_started_at && (
                      <div>
                        <p className="text-sm text-slate-600">Started</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatDate(profile.subscription_started_at)}
                        </p>
                      </div>
                    )}

                    {profile.subscription_ends_at && (
                      <div>
                        <p className="text-sm text-slate-600">
                          {isCancelled ? 'Cancelled On' : 'Renews On'}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatDate(profile.subscription_ends_at)}
                        </p>
                      </div>
                    )}

                    {profile.subscription_cancelled_at && (
                      <div>
                        <p className="text-sm text-slate-600">Cancellation Date</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatDate(profile.subscription_cancelled_at)}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-600">Auto-Renewal</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {profile.auto_renew ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  {isCancelled && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-amber-800">
                        Your subscription has been cancelled. You'll have access until the end of your billing period on{' '}
                        <strong>{formatDate(profile.subscription_ends_at)}</strong>.
                      </p>
                    </div>
                  )}

                  {isPastDue && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-red-800">
                        Your subscription payment is overdue. Please update your payment method to maintain access.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Features List */}
            <div>
              <p className="text-sm text-slate-600 mb-3 font-semibold">Included Features</p>
              <div className="space-y-2">
                {/* Free features */}
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Profile & Memorials</span>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Browse Resources</span>
                </div>

                {/* Premium features */}
                {isPremium && (
                  <>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-700">Messaging & Friends</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-700">Join Gatherings</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-700">See Attendee Lists</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-8 pt-8 border-t border-slate-200">
            {isPremium ? (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {loadingPortal ? 'Opening...' : 'Manage Subscription & Billing'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Update payment method, view invoices, or manage renewal settings
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleUpgrade}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Upgrade to Premium - $29/year
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Get unlimited access to gatherings, messaging, and more
                </p>
              </>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Billing FAQ</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">When will I be charged?</h3>
              <p className="text-slate-600">
                You'll be charged immediately when you upgrade to Premium, and then annually on the same date.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900 mb-2">Can I change my billing cycle?</h3>
              <p className="text-slate-600">
                Currently, we offer annual billing at $29/year. You can manage your subscription details in the Stripe billing portal.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900 mb-2">What happens if my payment fails?</h3>
              <p className="text-slate-600">
                If your payment fails, we'll mark your subscription as past due and notify you. You'll need to update your payment method to restore access. You can do this in the billing portal.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900 mb-2">Do you offer refunds?</h3>
              <p className="text-slate-600">
                Refunds are handled case-by-case. If you have a question about your billing, please contact our support team.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900 mb-2">Is my payment information secure?</h3>
              <p className="text-slate-600">
                Yes. We use Stripe to process all payments, which is PCI-DSS compliant and industry-leading for security. We never store your credit card information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
