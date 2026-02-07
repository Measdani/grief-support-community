'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Sponsor, sponsorTierInfo } from '@/lib/types/sponsor'

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    loadSponsors()
  }, [selectedTier])

  async function loadSponsors() {
    try {
      let query = supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .order('tier', { ascending: true })
        .order('display_order', { ascending: true })

      if (selectedTier !== 'all') {
        query = query.eq('tier', selectedTier)
      }

      const { data, error } = await query

      if (error) throw error
      setSponsors(data || [])
    } catch (error) {
      console.error('Error loading sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      platinum: 'from-slate-300 to-slate-400',
      gold: 'from-yellow-400 to-yellow-500',
      silver: 'from-gray-300 to-gray-400',
      bronze: 'from-orange-400 to-orange-500',
      community: 'from-green-400 to-green-500',
    }
    return colors[tier] || 'from-slate-300 to-slate-400'
  }

  const tiers = ['platinum', 'gold', 'silver', 'bronze', 'community']
  const platinumSponsors = sponsors.filter(s => s.tier === 'platinum')
  const goldSponsors = sponsors.filter(s => s.tier === 'gold')
  const silverSponsors = sponsors.filter(s => s.tier === 'silver')
  const bronzeSponsors = sponsors.filter(s => s.tier === 'bronze')
  const communitySponsors = sponsors.filter(s => s.tier === 'community')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back Home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Our Partners</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We're grateful to our sponsors who help support our community and provide resources for those navigating grief.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          <button
            onClick={() => setSelectedTier('all')}
            className={`px-4 py-2 rounded-full font-medium transition ${
              selectedTier === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All Tiers
          </button>
          {tiers.map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-full font-medium transition ${
                selectedTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {sponsorTierInfo[tier as keyof typeof sponsorTierInfo].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading sponsors...</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No sponsors found in this tier.</p>
            <Link
              href="/advertise"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Become a Sponsor
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Platinum Tier */}
            {platinumSponsors.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`h-1 w-12 bg-gradient-to-r ${getTierColor('platinum')}`} />
                  <h2 className="text-2xl font-bold text-slate-900">Platinum Partners</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {platinumSponsors.map(sponsor => (
                    <div
                      key={sponsor.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
                    >
                      <div className={`h-2 bg-gradient-to-r ${getTierColor('platinum')}`} />
                      <div className="p-8">
                        {sponsor.logo_url && (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.company_name}
                            className="h-12 mb-4 object-contain"
                          />
                        )}
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{sponsor.company_name}</h3>
                        {sponsor.tagline && (
                          <p className="text-sm text-blue-600 font-medium mb-3">{sponsor.tagline}</p>
                        )}
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3">{sponsor.description}</p>
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          Visit Website →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gold Tier */}
            {goldSponsors.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`h-1 w-12 bg-gradient-to-r ${getTierColor('gold')}`} />
                  <h2 className="text-2xl font-bold text-slate-900">Gold Partners</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  {goldSponsors.map(sponsor => (
                    <div
                      key={sponsor.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
                    >
                      <div className={`h-2 bg-gradient-to-r ${getTierColor('gold')}`} />
                      <div className="p-6">
                        {sponsor.logo_url && (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.company_name}
                            className="h-10 mb-3 object-contain"
                          />
                        )}
                        <h3 className="font-bold text-slate-900 mb-2">{sponsor.company_name}</h3>
                        {sponsor.tagline && (
                          <p className="text-xs text-blue-600 font-medium mb-2">{sponsor.tagline}</p>
                        )}
                        <p className="text-slate-600 text-xs mb-3 line-clamp-2">{sponsor.description}</p>
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition"
                        >
                          Visit →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Silver & Bronze Tiers */}
            {(silverSponsors.length > 0 || bronzeSponsors.length > 0) && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`h-1 w-12 bg-gradient-to-r ${getTierColor('silver')}`} />
                  <h2 className="text-2xl font-bold text-slate-900">Community Partners</h2>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  {[...silverSponsors, ...bronzeSponsors].map(sponsor => (
                    <a
                      key={sponsor.id}
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition group"
                    >
                      {sponsor.logo_url && (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.company_name}
                          className="h-8 mb-2 object-contain"
                        />
                      )}
                      <p className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition">
                        {sponsor.company_name}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Community Tier */}
            {communitySponsors.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`h-1 w-12 bg-gradient-to-r ${getTierColor('community')}`} />
                  <h2 className="text-2xl font-bold text-slate-900">Nonprofit Partners</h2>
                </div>
                <div className="grid md:grid-cols-5 gap-3">
                  {communitySponsors.map(sponsor => (
                    <a
                      key={sponsor.id}
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 hover:shadow-md transition group text-center"
                    >
                      {sponsor.logo_url && (
                        <img
                          src={sponsor.logo_url}
                          alt={sponsor.company_name}
                          className="h-6 mb-2 object-contain mx-auto"
                        />
                      )}
                      <p className="font-medium text-slate-900 text-xs group-hover:text-blue-600 transition line-clamp-2">
                        {sponsor.company_name}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Interested in Sponsoring?</h2>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            Your partnership helps us support thousands of people navigating grief. Learn about our sponsorship opportunities and how your organization can make a meaningful impact.
          </p>
          <Link
            href="/advertise"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-lg"
          >
            Become a Partner
          </Link>
        </div>
      </div>
    </div>
  )
}
