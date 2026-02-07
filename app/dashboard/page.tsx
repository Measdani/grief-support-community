import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardNav } from '@/components/DashboardNav'
import type { VerificationStatus } from '@/lib/types/verification'

export default async function Dashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch upcoming meetups (next 3)
  const { data: upcomingMeetups } = await supabase
    .from('meetups')
    .select(`
      id, title, start_time, format, location_city, location_state,
      attendee_count, max_attendees, loss_categories
    `)
    .eq('status', 'published')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3)

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100"
      style={{
        backgroundImage: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 1400 1200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23e0e7ff' stop-opacity='0.4'/%3E%3Cstop offset='100%25' stop-color='%23fce7f3' stop-opacity='0.4'/%3E%3C/linearGradient%3E%3Cpath id='wave' d='M0,300 Q350,250 700,300 T1400,300 L1400,0 L0,0 Z' fill='url(%23grad1)'/%3E%3C/defs%3E%3Cuse href='%23wave' y='0'/%3E%3Cuse href='%23wave' y='150' opacity='0.5'/%3E%3Cuse href='%23wave' y='300' opacity='0.3'/%3E%3Ccircle cx='150' cy='200' r='80' fill='%23dbeafe' opacity='0.2'/%3E%3Ccircle cx='1250' cy='400' r='120' fill='%23fecaca' opacity='0.15'/%3E%3Ccircle cx='700' cy='600' r='100' fill='%23d1d5db' opacity='0.1'/%3E%3C/svg%3E"
        )`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center top'
      }}
    >
      <DashboardNav
        userEmail={user.email!}
        verificationStatus={profile?.verification_status as VerificationStatus}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-32">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Welcome. You're here.</h1>
          <p className="text-lg text-slate-600">
            This is your space within the community. Move through it at your own pace—nothing here requires urgency.
          </p>
        </div>

        {/* Content */}
        <div className="pt-16">
        {profile && profile.verification_status === 'unverified' && (
          <div className="mb-16 bg-amber-50 rounded-xl shadow-sm p-8 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Complete Email Verification to Get Started</h3>
                <p className="text-sm text-amber-800 mb-3">
                  To create memorials, join support groups, and access other features, you need to verify your email address.
                </p>
                <Link
                  href="/dashboard/profile"
                  className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium text-sm"
                >
                  Verify Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:border-blue-300 transition block space-y-4">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Your Profile
              </h3>
              <p className="text-slate-600 mb-4 text-sm">
                This is your space. Share only what feels right, now or later.
              </p>
              <Link href="/dashboard/profile" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                View Your Profile →
              </Link>
            </div>

            {profile?.verification_status === 'meetup_organizer' && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⭐</span>
                  <span className="inline-block bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    Trusted Organizer
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Can create and host community meetups
                </p>
              </div>
            )}
          </div>

          <div className={`bg-white rounded-xl shadow-sm p-6 border border-slate-200 transition block ${profile?.verification_status === 'unverified' ? 'opacity-60' : 'hover:border-purple-300'}`}>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🕯️</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Honor Loved Ones
            </h3>
            <p className="text-slate-600 mb-4 text-sm">
              Create a memorial when and if you're ready—a place to remember, reflect, or simply hold space.
            </p>
            {profile?.verification_status === 'unverified' ? (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm">
                🔒 Requires Email Verification
              </span>
            ) : (
              <Link href="/dashboard/memorials" className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                View Memorials →
              </Link>
            )}
          </div>

          <Link href="/meetups" className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:border-green-300 transition block">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤝</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Find Support Gatherings
            </h3>
            <p className="text-slate-600 mb-4 text-sm">
              Connect with others through quiet moments, shared activities, or gentle companionship—online or in person.
            </p>
            <span className="text-green-600 hover:text-green-700 font-medium text-sm">
              Browse Gatherings →
            </span>
          </Link>

          <Link href="/resources" className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:border-amber-300 transition block">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Grief Resources
            </h3>
            <p className="text-slate-600 mb-4 text-sm">
              Supportive readings, hotlines, and tools—here if and when you need them.
            </p>
            <span className="text-amber-600 hover:text-amber-700 font-medium text-sm">
              Explore Resources →
            </span>
          </Link>
        </div>

        {/* Upcoming Meetups */}
        {upcomingMeetups && upcomingMeetups.length > 0 && (
          <div className="mt-24 bg-white rounded-xl shadow-sm p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Upcoming Support Gatherings</h2>
              <Link href="/meetups" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Browse Gatherings →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingMeetups.map((meetup: any) => (
                <Link
                  key={meetup.id}
                  href={`/meetups/${meetup.id}`}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <div className="text-center bg-blue-100 text-blue-800 rounded-lg p-2 min-w-[60px]">
                    <div className="text-xs font-medium uppercase">
                      {new Date(meetup.start_time).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="text-xl font-bold">
                      {new Date(meetup.start_time).getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">{meetup.title}</h3>
                    <p className="text-sm text-slate-600">
                      {meetup.format === 'virtual' ? '💻 Virtual' : `📍 ${meetup.location_city}, ${meetup.location_state}`}
                      {' • '}
                      {new Date(meetup.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    👥 {meetup.attendee_count}{meetup.max_attendees ? `/${meetup.max_attendees}` : ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Welcome Message */}
        <div className="mt-24 bg-white rounded-xl shadow-sm p-10 border border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            A Place to Be Held by Community
          </h2>
          <div className="text-lg text-slate-600 leading-relaxed space-y-3">
            <p>Take things at your own pace—some days you may reach out, other days you may simply sit.</p>
            <p>When you're ready, you'll find people who understand.</p>
            <p>Until then, take your time. This space remains open to you.</p>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
