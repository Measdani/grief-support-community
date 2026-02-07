import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-slate-800">Holding Space Together</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login" className="px-4 py-2 text-slate-700 hover:text-slate-900">
                Sign In
              </Link>
              <Link href="/auth/signup" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Join Us
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            You Don't Have to Grieve Alone
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Connect with others who understand your loss. Find comfort, share your story,
            and support one another through the journey of grief.
          </p>
          <Link href="/auth/signup" className="inline-block px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition shadow-lg">
            Find Your Community
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Find Support
            </h3>
            <p className="text-slate-600">
              Connect with others who have experienced similar losses and understand what you're going through.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Share Stories
            </h3>
            <p className="text-slate-600">
              Share memories, experiences, and feelings in a safe, compassionate environment.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Meet Locally
            </h3>
            <p className="text-slate-600">
              Find people in your area for in-person support groups and gatherings.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-24 bg-white rounded-2xl shadow-lg p-12 text-center">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Take the First Step?
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join our community today and find the support you need. Creating an account is free
            and takes just a few moments.
          </p>
          <Link href="/auth/signup" className="inline-block px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition shadow-lg">
            Create Your Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-500">
            Holding Space Together - A safe space for healing and connection
          </p>
        </div>
      </footer>
    </div>
  );
}
