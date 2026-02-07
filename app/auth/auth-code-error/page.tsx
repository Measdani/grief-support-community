import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Email Verification Error
        </h1>

        <p className="text-gray-600 mb-6">
          There was a problem verifying your email. This could happen if:
        </p>

        <ul className="text-left text-sm text-gray-600 mb-6 space-y-2">
          <li>• The verification link has expired</li>
          <li>• The link has already been used</li>
          <li>• There was a configuration issue</li>
        </ul>

        <div className="space-y-3">
          <Link
            href="/auth/signup"
            className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Signing Up Again
          </Link>

          <Link
            href="/auth/login"
            className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
