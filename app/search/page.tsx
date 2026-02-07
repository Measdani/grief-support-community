'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface SearchResults {
  users: any[]
  memorials: any[]
  meetups: any[]
  forums: any[]
  resources: any[]
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(!!query)
  const [searchQuery, setSearchQuery] = useState(query)

  useEffect(() => {
    if (query && query.length > 1) {
      search()
    } else {
      setLoading(false)
    }
  }, [query])

  async function search() {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const url = new URL(window.location.href)
      url.searchParams.set('q', searchQuery)
      window.history.pushState({}, '', url.toString())
      setSearchQuery('')
    }
  }

  const totalResults = results
    ? results.users.length + results.memorials.length + results.meetups.length + results.forums.length + results.resources.length
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Search</h1>
          <p className="text-slate-600">Find people, memorials, meetups, and more</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery || query}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Search
            </button>
          </div>
        </form>

        {loading && (
          <div className="text-center py-8">
            <p className="text-slate-600">Searching...</p>
          </div>
        )}

        {!loading && results && query && (
          <>
            {totalResults === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                <p className="text-slate-600 mb-4">No results found for "{query}"</p>
                <p className="text-sm text-slate-500">Try different keywords or browse the community instead</p>
              </div>
            ) : (
              <div className="space-y-6">
                {results.users.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">People ({results.users.length})</h2>
                    <div className="space-y-2">
                      {results.users.map(user => (
                        <Link
                          key={user.id}
                          href={`/profiles/${user.id}`}
                          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
                        >
                          <div className="flex items-center gap-3">
                            {user.profile_image_url ? (
                              <img src={user.profile_image_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">👤</div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{user.display_name}</p>
                              <p className="text-xs text-slate-500">{user.verification_status.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {results.meetups.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Meetups ({results.meetups.length})</h2>
                    <div className="space-y-2">
                      {results.meetups.map(meetup => (
                        <Link
                          key={meetup.id}
                          href={`/meetups/${meetup.id}`}
                          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{meetup.title}</p>
                            <p className="text-sm text-slate-600">{meetup.location_city} • {meetup.attendee_count} attending</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {results.forums.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Forum Discussions ({results.forums.length})</h2>
                    <div className="space-y-2">
                      {results.forums.map(topic => (
                        <Link
                          key={topic.id}
                          href={`/forums/t/${topic.id}`}
                          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{topic.title}</p>
                            <p className="text-sm text-slate-600">{topic.reply_count} replies</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {results.memorials.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Memorials ({results.memorials.length})</h2>
                    <div className="space-y-2">
                      {results.memorials.map(memorial => (
                        <Link
                          key={memorial.id}
                          href={`/memorials/${memorial.id}`}
                          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{memorial.name}</p>
                            <p className="text-sm text-slate-600">{memorial.person_name} • {memorial.loss_type}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {results.resources.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Resources ({results.resources.length})</h2>
                    <div className="space-y-2">
                      {results.resources.map(resource => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{resource.title}</p>
                            <p className="text-sm text-slate-600">{resource.category}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !query && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Enter a search term to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
