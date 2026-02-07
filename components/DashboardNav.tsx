'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VerificationBadge } from '@/components/VerificationBadge'
import type { VerificationStatus } from '@/lib/types/verification'

interface DashboardNavProps {
  userEmail: string
  verificationStatus?: VerificationStatus
}

export function DashboardNav({ userEmail, verificationStatus }: DashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navLinks = [
    { href: '/forums', label: 'Forums' },
    { href: '/meetups', label: 'Meetups' },
    { href: '/resources', label: 'Resources' },
    { href: '/store', label: 'Store' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <>
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="text-2xl font-semibold text-slate-800">
              Holding Space Together
            </Link>

            {/* Right side - User profile and menu button */}
            <div className="flex items-center gap-4">
              {/* Home Button */}
              <Link
                href="/dashboard"
                className="px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition text-sm font-medium"
                title="Home"
              >
                Home
              </Link>

              {/* User Profile Link */}
              <Link
                href="/dashboard/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <span className="text-sm truncate max-w-xs">{userEmail}</span>
                {verificationStatus && (
                  <VerificationBadge status={verificationStatus} showLabel={false} size="sm" />
                )}
              </Link>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Drawer Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel - Right side */}
          <div className="fixed right-0 top-0 h-full w-64 bg-slate-900 text-white shadow-xl z-40 overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 p-2 hover:bg-slate-800 rounded-lg"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Menu content */}
            <div className="pt-16 pb-6">
              {/* Navigation Links */}
              <div className="space-y-2 px-4">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 text-slate-100 hover:bg-slate-800 rounded-lg transition"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 border-t border-slate-700" />

              {/* User section */}
              <div className="px-4 space-y-2">
                {/* Mobile user profile link */}
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex sm:hidden items-center gap-2 px-4 py-3 text-slate-100 hover:bg-slate-800 rounded-lg transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{userEmail}</p>
                  </div>
                  {verificationStatus && (
                    <VerificationBadge status={verificationStatus} showLabel={false} size="sm" />
                  )}
                </Link>

                {/* Sign out button */}
                <button
                  onClick={() => {
                    setIsOpen(false)
                    handleSignOut()
                  }}
                  className="w-full text-left px-4 py-3 text-slate-100 hover:bg-slate-800 rounded-lg transition text-sm font-medium"
                >
                  Sign Out
                </button>

                {/* Suggestions link */}
                <Link
                  href="/suggestions"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-slate-100 hover:bg-slate-800 rounded-lg transition"
                >
                  💡 Suggestions
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
