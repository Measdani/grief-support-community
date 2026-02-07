'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'


export const dynamic = 'force-dynamic'

export default function MeetupsPage() {
  const [meetups, setMeetups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAdmin().then(() => loadMeetups())
  }, [])

  async function checkAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/auth/login')
  }

  async function loadMeetups() {
    const supabase = createClient()
    const { data } = await supabase
      .from('meetups')
      .select('*')
      .order('start_time', { ascending: false })
    setMeetups(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('meetups').update({ status }).eq('id', id)
    setMeetups(meetups.map(m => m.id === id ? { ...m, status } : m))
  }

  if (loading) return <div className="flex justify-center py-12"><p>Loading...</p></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <Link href="/admin" className="text-blue-600 mb-4 inline-block">← Back to Admin</Link>
        <h1 className="text-3xl font-bold mb-6">Meetup Moderation</h1>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Attendees</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetups.map(m => (
                <tr key={m.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{m.title}</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{m.status}</span></td>
                  <td className="py-3 px-4">{new Date(m.start_time).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{m.attendee_count}</td>
                  <td className="py-3 px-4">
                    <select value={m.status} onChange={(e) => updateStatus(m.id, e.target.value)} className="text-xs px-2 py-1 border rounded">
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
