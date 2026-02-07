'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SponsorTier, AdPlacementLocation, sponsorTierInfo, placementLabels } from '@/lib/types/sponsor'

export default function AdvertisePage() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website_url: '',
    company_description: '',
    interested_tiers: [] as SponsorTier[],
    interested_placements: [] as AdPlacementLocation[],
    budget_range: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const tiers: SponsorTier[] = ['platinum', 'gold', 'silver', 'bronze', 'community']
  const placements: AdPlacementLocation[] = [
    'homepage_banner',
    'resources_sidebar',
    'forums_banner',
    'meetups_sidebar',
    'newsletter',
  ]

  function toggleTier(tier: SponsorTier) {
    setFormData(prev => ({
      ...prev,
      interested_tiers: prev.interested_tiers.includes(tier)
        ? prev.interested_tiers.filter(t => t !== tier)
        : [...prev.interested_tiers, tier],
    }))
  }

  function togglePlacement(placement: AdPlacementLocation) {
    setFormData(prev => ({
      ...prev,
      interested_placements: prev.interested_placements.includes(placement)
        ? prev.interested_placements.filter(p => p !== placement)
        : [...prev.interested_placements, placement],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/advertising/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to submit inquiry')
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting inquiry:', error)
      alert('Failed to submit inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h1>
            <p className="text-slate-600 mb-6">
              We've received your sponsorship inquiry and will be in touch within 2-3 business days.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Partner With Us</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Reach a caring, engaged community while supporting those navigating grief.
            Our sponsors help us provide free resources and support to thousands.
          </p>
        </div>

        {/* Why Sponsor */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Why Partner With Our Community?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-3">💝</div>
              <h3 className="font-bold text-slate-900 mb-2">Meaningful Impact</h3>
              <p className="text-slate-600 text-sm">
                Your support directly helps people through their most difficult times.
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-bold text-slate-900 mb-2">Engaged Audience</h3>
              <p className="text-slate-600 text-sm">
                Connect with users who value mental health, wellness, and community support.
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-slate-900 mb-2">Targeted Reach</h3>
              <p className="text-slate-600 text-sm">
                Perfect for grief counselors, therapists, memorial services, and wellness brands.
              </p>
            </div>
          </div>
        </div>

        {/* Sponsorship Tiers */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Sponsorship Tiers</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map(tier => {
              const info = sponsorTierInfo[tier]
              return (
                <div
                  key={tier}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className={`h-2 ${info.color}`} />
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{info.label}</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-4">{info.price}</p>
                    <ul className="space-y-2">
                      {info.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-green-600 mt-0.5">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-12">
          <h3 className="font-bold text-amber-900 mb-3">Advertising Guidelines</h3>
          <p className="text-amber-800 text-sm mb-3">
            To maintain a safe, supportive environment, we carefully review all sponsors. We welcome:
          </p>
          <ul className="text-sm text-amber-800 space-y-1 mb-3">
            <li>• Licensed therapists and grief counselors</li>
            <li>• Memorial and funeral service providers</li>
            <li>• Mental health and wellness organizations</li>
            <li>• Grief-related books, resources, and educational content</li>
            <li>• Nonprofits supporting bereaved individuals</li>
          </ul>
          <p className="text-amber-800 text-sm">
            We do not accept advertising that is predatory, insensitive, or unrelated to our community's mission.
          </p>
        </div>

        {/* Inquiry Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Get In Touch</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={e => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={e => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={e => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={e => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Budget Range
                </label>
                <select
                  value={formData.budget_range}
                  onChange={e => setFormData(prev => ({ ...prev, budget_range: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a range</option>
                  <option value="under-500">Under $500/month</option>
                  <option value="500-1000">$500 - $1,000/month</option>
                  <option value="1000-2000">$1,000 - $2,000/month</option>
                  <option value="2000+">$2,000+/month</option>
                  <option value="in-kind">In-kind / Trade</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                About Your Company *
              </label>
              <textarea
                required
                rows={3}
                value={formData.company_description}
                onChange={e => setFormData(prev => ({ ...prev, company_description: e.target.value }))}
                placeholder="Tell us about your organization and how it relates to grief support..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interested Tiers (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {tiers.map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      formData.interested_tiers.includes(tier)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sponsorTierInfo[tier].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interested Placements (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {placements.map(placement => (
                  <button
                    key={placement}
                    type="button"
                    onClick={() => togglePlacement(placement)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      formData.interested_placements.includes(placement)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {placementLabels[placement]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Message *
              </label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Tell us more about what you're looking for in a sponsorship..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
