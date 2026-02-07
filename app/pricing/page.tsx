'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
export const dynamic = 'force-dynamic'

interface Profile {
  subscription_tier: string
}

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()

        setProfile(profile)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    if (!user) {
      router.push('/auth/login')
      return
    }

    setCheckingOut(true)
    try {
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.sessionId) {
        // Redirect to Stripe checkout
        if ((window as any).Stripe) {
          const stripe = await (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
          await stripe.redirectToCheckout({ sessionId: data.sessionId })
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  const features = [
    {
      name: 'Profile & Memorials',
      free: true,
      premium: true,
    },
    {
      name: 'Browse Resources',
      free: true,
      premium: true,
    },
    {
      name: 'Suggest Resources',
      free: true,
      premium: true,
    },
    {
      name: 'View Gathering Titles',
      free: true,
      premium: true,
    },
    {
      name: 'Messaging & Friends',
      free: false,
      premium: true,
    },
    {
      name: 'Join Gatherings (RSVP)',
      free: false,
      premium: true,
    },
    {
      name: 'View Full Gathering Details',
      free: false,
      premium: true,
    },
    {
      name: 'See Attendee Lists',
      free: false,
      premium: true,
    },
    {
      name: 'Create/Host Gatherings',
      free: false,
      premium: true,
      note: 'Requires background check',
    },
  ]

  const faqs = [
    {
      question: 'What\'s the difference between a background check and premium membership?',
      answer: 'Premium membership ($29/year) gives you access to messaging, friends, and joining gatherings. A background check is required separately if you want to create or host gatherings. They\'re independent - you can be premium without hosting, or host without being premium.',
    },
    {
      question: 'Can I cancel my subscription?',
      answer: 'Yes, you can cancel anytime from your billing settings. Your access continues through the end of your billing period. After cancellation, you\'ll automatically downgrade to the free tier.',
    },
    {
      question: 'How does billing work?',
      answer: 'Premium is $29 per year. Your subscription renews automatically each year unless you cancel. You can manage your subscription and payment methods from your billing settings page.',
    },
    {
      question: 'Do I need to pay to access resources or forums?',
      answer: 'No! Resources, forums, and suggestions are available to all users on the free tier. Premium is only needed for gatherings and direct messaging.',
    },
    {
      question: 'What if I want to host gatherings?',
      answer: 'To create or host gatherings, you need: 1) Premium membership ($29/year) and 2) An approved background check. The background check process is manual and free - our team will review your application.',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  const isPremium = profile?.subscription_tier === 'premium'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Simple, Transparent Pricing</h1>
              <p className="text-lg text-slate-600">
                Choose the plan that fits your needs
              </p>
            </div>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-slate-200 hover:border-slate-300 transition">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Free</h2>
              <p className="text-slate-600 mb-6">Perfect for browsing and learning</p>

              <div className="mb-8">
                <div className="text-4xl font-bold text-slate-900">$0</div>
                <p className="text-sm text-slate-600 mt-2">Forever free, no credit card needed</p>
              </div>

              {!user ? (
                <Link
                  href="/auth/signup"
                  className="block w-full px-6 py-3 bg-slate-100 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition text-center mb-8"
                >
                  Get Started
                </Link>
              ) : isPremium ? (
                <div className="w-full px-6 py-3 bg-green-100 text-green-800 font-semibold rounded-lg text-center mb-8">
                  Currently on Premium
                </div>
              ) : (
                <div className="w-full px-6 py-3 bg-blue-100 text-blue-800 font-semibold rounded-lg text-center mb-8">
                  Your Current Plan
                </div>
              )}

              <div className="space-y-4">
                <p className="font-semibold text-slate-900 mb-4">What's included:</p>
                {features.map((feature, idx) => (
                  feature.free && (
                    <div key={idx} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-slate-700">{feature.name}</span>
                        {feature.note && <span className="text-xs text-slate-500 ml-2">({feature.note})</span>}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Premium Tier */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-500 hover:border-blue-600 transition relative">
            <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white py-2 px-4 text-center text-sm font-semibold">
              Recommended
            </div>
            <div className="p-8 pt-16">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Premium</h2>
              <p className="text-slate-600 mb-6">Full access to connect and gather</p>

              <div className="mb-8">
                <div className="text-4xl font-bold text-slate-900">$29<span className="text-lg text-slate-600">/year</span></div>
                <p className="text-sm text-slate-600 mt-2">Billed once per year</p>
              </div>

              {!user ? (
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {checkingOut ? 'Processing...' : 'Upgrade Now'}
                </button>
              ) : isPremium ? (
                <Link
                  href="/dashboard/settings/billing"
                  className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Manage Subscription
                </Link>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {checkingOut ? 'Processing...' : 'Upgrade Now'}
                </button>
              )}

              <div className="space-y-4 mt-8">
                <p className="font-semibold text-slate-900 mb-4">Everything in Free, plus:</p>
                {features.map((feature, idx) => (
                  feature.premium && (
                    <div key={idx} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-slate-700">{feature.name}</span>
                        {feature.note && <span className="text-xs text-slate-500 ml-2">({feature.note})</span>}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-20">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Feature Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-4 px-4 font-semibold text-slate-900">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold text-slate-900">Free</th>
                    <th className="text-center py-4 px-4 font-semibold text-slate-900">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 text-slate-700">
                        <div>{feature.name}</div>
                        {feature.note && <div className="text-xs text-slate-500">{feature.note}</div>}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {feature.free ? (
                          <svg className="w-5 h-5 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {feature.premium ? (
                          <svg className="w-5 h-5 text-blue-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-slate-200 last:border-b-0 pb-6 last:pb-0">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{faq.question}</h3>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-blue-600 rounded-2xl shadow-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Connect?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Start with free access to profiles, memorials, and resources. Upgrade anytime to join gatherings and connect with others.
          </p>
          {!user ? (
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              Create Your Account
            </Link>
          ) : isPremium ? (
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
            >
              {checkingOut ? 'Processing...' : 'Upgrade to Premium'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
