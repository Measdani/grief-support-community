import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { VerificationBadge } from '@/components/VerificationBadge'
import type { VerificationStatus } from '@/lib/types/verification'

export default async function MemorialsPage() {
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

  // Fetch all public memorials or user's own memorials
  const { data: memorials } = await supabase
    .from('memorials')
    .select('*')
    .or(`is_public.eq.true,created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-2xl font-semibold text-slate-800">
                Holding Space Together
              </Link>
              <Link
                href="/dashboard/memorials"
                className="text-sm font-medium text-blue-600"
              >
                Memorials
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <span>{user.email}</span>
                {profile && <VerificationBadge status={profile.verification_status as VerificationStatus} showLabel={false} size="sm" />}
              </Link>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Memorials</h1>
            <p className="mt-2 text-slate-600">
              Honor and remember loved ones who have passed
            </p>
          </div>
          {profile?.verification_status && ['email_verified', 'id_verified', 'meetup_organizer', 'admin'].includes(profile.verification_status) && (
            <Link
              href="/dashboard/memorials/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Create Memorial
            </Link>
          )}
        </div>

        {/* Memorials Grid */}
        {memorials && memorials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memorials.map((memorial) => {
              const age = memorial.date_of_birth && memorial.date_of_passing
                ? new Date(memorial.date_of_passing).getFullYear() - new Date(memorial.date_of_birth).getFullYear()
                : null

              return (
                <Link
                  key={memorial.id}
                  href={`/dashboard/memorials/${memorial.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition overflow-hidden"
                >
                  {/* Cover Photo */}
                  {memorial.cover_photo_url ? (
                    <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-300 relative">
                      <img
                        src={memorial.cover_photo_url}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-300" />
                  )}

                  <div className="p-6">
                    {/* Profile Photo */}
                    <div className="flex items-start gap-4 -mt-16 mb-4">
                      <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-300 overflow-hidden flex-shrink-0">
                        {memorial.profile_photo_url ? (
                          <img
                            src={memorial.profile_photo_url}
                            alt={`${memorial.first_name} ${memorial.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-500">
                            👤
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {memorial.first_name} {memorial.middle_name && `${memorial.middle_name} `}{memorial.last_name}
                    </h3>
                    {memorial.nickname && (
                      <p className="text-sm text-slate-600 mb-2">"{memorial.nickname}"</p>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                      {memorial.date_of_birth && (
                        <span>{new Date(memorial.date_of_birth).getFullYear()}</span>
                      )}
                      <span>—</span>
                      <span>{new Date(memorial.date_of_passing).getFullYear()}</span>
                      {age && <span className="text-slate-500">({age} years old)</span>}
                    </div>

                    {/* Relationship */}
                    {memorial.relationship_to_creator && (
                      <p className="text-sm text-slate-600 mb-3">
                        <span className="font-medium">Relationship:</span> {memorial.relationship_to_creator}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="text-6xl mb-4">🕯️</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Memorials Yet</h3>
            <p className="text-slate-600 mb-6">
              Be the first to create a memorial to honor a loved one
            </p>
            {profile?.verification_status && ['email_verified', 'id_verified', 'meetup_organizer', 'admin'].includes(profile.verification_status) && (
              <Link
                href="/dashboard/memorials/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Create First Memorial
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
