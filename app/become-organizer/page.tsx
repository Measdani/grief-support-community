'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
export const dynamic = 'force-dynamic'

export default function BecomeOrganizerPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [existingApplication, setExistingApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [experience, setExperience] = useState('')
  const [motivation, setMotivation] = useState('')
  const [plannedMeetups, setPlannedMeetups] = useState('')
  const [certifications, setCertifications] = useState('')
  const [backgroundConsent, setBackgroundConsent] = useState(false)

  const router = useRouter()

  const VERIFICATION_FEE = 4999 // $49.99

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profile)

    // Check for existing application
    const { data: app } = await supabase
      .from('organizer_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (app) {
      setExistingApplication(app)
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    if (!user || !backgroundConsent) return

    setSubmitting(true)
    try {
      // Create application
      const { data: app, error: appError } = await supabase
        .from('organizer_applications')
        .insert({
          user_id: user.id,
          experience,
          motivation,
          planned_meetups: plannedMeetups,
          certifications: certifications || null,
          background_check_consent: backgroundConsent,
          payment_amount_cents: VERIFICATION_FEE,
          status: 'pending_payment',
        })
        .select()
        .single()

      if (appError) throw appError

      // Create Stripe checkout session
      const res = await fetch('/api/organizer/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe
      window.location.href = data.url
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  // Already an organizer
  if (profile?.verification_status === 'meetup_organizer') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">You're Already a Verified Organizer!</h1>
            <p className="text-slate-600 mb-6">
              You can create and manage meetups from your dashboard.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show existing application status
  if (existingApplication && ['pending_payment', 'payment_complete', 'under_review'].includes(existingApplication.status)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Dashboard
          </Link>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Application Status</h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {existingApplication.status === 'pending_payment' ? '💳' :
                   existingApplication.status === 'payment_complete' ? '✅' : '🔍'}
                </div>
                <div>
                  <p className="font-medium text-blue-900">
                    {existingApplication.status === 'pending_payment' ? 'Awaiting Payment' :
                     existingApplication.status === 'payment_complete' ? 'Payment Received' : 'Under Review'}
                  </p>
                  <p className="text-sm text-blue-800">
                    {existingApplication.status === 'pending_payment'
                      ? 'Complete payment to submit your application'
                      : 'We will review your application and get back to you soon'}
                  </p>
                </div>
              </div>
            </div>

            {existingApplication.status === 'pending_payment' && (
              <button
                onClick={async () => {
                  const res = await fetch('/api/organizer/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: existingApplication.id }),
                  })
                  const data = await res.json()
                  if (data.url) {
                    window.location.href = data.url
                  }
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Complete Payment (${(VERIFICATION_FEE / 100).toFixed(2)})
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Become a Meetup Organizer</h1>
            <p className="text-slate-600">
              Lead grief support meetups and help others in their healing journey
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-slate-900 mb-3">As a Verified Organizer, you can:</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Create and host virtual or in-person meetups
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Build a community around specific types of grief
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Display a verified organizer badge on your profile
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                Access organizer resources and training materials
              </li>
            </ul>
          </div>

          {/* Fee Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-amber-900 font-medium">
              One-time verification fee: ${(VERIFICATION_FEE / 100).toFixed(2)}
            </p>
            <p className="text-sm text-amber-800 mt-1">
              This helps us verify organizers and maintain a safe community.
            </p>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Experience with Grief Support *
              </label>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={3}
                required
                placeholder="Tell us about your experience with grief support, counseling, or group facilitation..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Why do you want to host meetups? *
              </label>
              <textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                rows={3}
                required
                placeholder="Share your motivation for becoming an organizer..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                What kind of meetups do you plan to host? *
              </label>
              <textarea
                value={plannedMeetups}
                onChange={(e) => setPlannedMeetups(e.target.value)}
                rows={3}
                required
                placeholder="Describe the types of meetups you'd like to organize (e.g., loss type, format, frequency)..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Relevant Certifications (Optional)
              </label>
              <textarea
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                rows={2}
                placeholder="List any relevant certifications, training, or credentials..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                checked={backgroundConsent}
                onChange={(e) => setBackgroundConsent(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="consent" className="text-sm text-slate-700">
                I consent to a background check and agree to follow the community guidelines
                for organizers. I understand that providing false information may result in
                removal of my organizer status.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || !backgroundConsent}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : `Submit Application & Pay $${(VERIFICATION_FEE / 100).toFixed(2)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
