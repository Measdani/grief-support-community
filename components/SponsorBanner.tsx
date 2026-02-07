'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Sponsor } from '@/lib/types/sponsor'

interface SponsorBannerProps {
  location: string
  maxSponsors?: number
}

export default function SponsorBanner({ location, maxSponsors = 3 }: SponsorBannerProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadSponsors()
  }, [location])

  async function loadSponsors() {
    try {
      // Get active sponsors
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .eq('show_on_homepage', true)
        .order('display_order', { ascending: true })
        .limit(maxSponsors)

      if (error) throw error
      setSponsors(data || [])

      // Track impressions for each sponsor
      if (data && data.length > 0) {
        data.forEach(sponsor => {
          fetch('/api/sponsors/track-impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sponsor_id: sponsor.id,
              location: 'homepage_banner',
            }),
          }).catch(err => console.error('Error tracking impression:', err))
        })
      }
    } catch (error) {
      console.error('Error loading sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSponsorClick(sponsorId: string) {
    // Track click
    await fetch('/api/sponsors/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sponsor_id: sponsorId,
        location: 'homepage_banner',
      }),
    }).catch(err => console.error('Error tracking click:', err))
  }

  if (loading || sponsors.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-t border-b border-slate-200 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-600 mb-6">
          Supported by our generous partners
        </p>
        <div className={`grid gap-6 ${sponsors.length === 1 ? 'max-w-sm mx-auto' : sponsors.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {sponsors.map(sponsor => (
            <a
              key={sponsor.id}
              href={sponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleSponsorClick(sponsor.id)}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition group"
            >
              {sponsor.logo_url && (
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.company_name}
                  className="h-10 mb-3 object-contain"
                />
              )}
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition mb-1">
                {sponsor.company_name}
              </h3>
              {sponsor.tagline && (
                <p className="text-sm text-slate-600 line-clamp-2">{sponsor.tagline}</p>
              )}
            </a>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link
            href="/sponsors"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all partners →
          </Link>
        </div>
      </div>
    </div>
  )
}
