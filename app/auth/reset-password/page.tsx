'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(
          'Password reset email sent! Check your inbox for instructions to reset your password.'
        )
        setEmail('')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-semibold text-slate-800 hover:text-slate-900">
            Holding Space Together
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Reset Password
          </h2>
          <p className="mt-2 text-slate-600">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {/* Reset Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {message}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign Up
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Check your spam folder if you don't see the email within a few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
