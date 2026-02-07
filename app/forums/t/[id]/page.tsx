'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ForumTopic, ForumPostWithAuthorAndReplies, ForumCategory } from '@/lib/types/forum'
import { PostCard } from '@/components/forums/PostCard'

export default function ForumTopicPage() {
  const [topic, setTopic] = useState<ForumTopic | null>(null)
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [posts, setPosts] = useState<ForumPostWithAuthorAndReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null)
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [toggleSubscribing, setToggleSubscribing] = useState(false)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const topicId = params.id as string

  useEffect(() => {
    checkUser()
    loadTopic()
  }, [topicId])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadTopic() {
    try {
      // Load topic
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select('*')
        .eq('id', topicId)
        .single()

      if (topicError || !topicData) {
        router.push('/forums')
        return
      }

      setTopic(topicData)

      // Load category
      const { data: categoryData } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('id', topicData.category_id)
        .single()

      setCategory(categoryData)

      // Load posts with nested replies
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles!forum_posts_author_id_fkey(id, display_name, avatar_url, verification_status),
          replies:forum_posts!parent_post_id(
            *,
            author:profiles!forum_posts_author_id_fkey(id, display_name, avatar_url, verification_status)
          )
        `)
        .eq('topic_id', topicId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: true })

      if (postsData) {
        setPosts(postsData as ForumPostWithAuthorAndReplies[])
      }

      // Load user's likes if logged in
      if (user?.id) {
        const { data: likesData } = await supabase
          .from('forum_post_likes')
          .select('post_id')
          .eq('user_id', user.id)

        if (likesData) {
          setUserLikes(new Set(likesData.map(like => like.post_id)))
        }

        // Load user's subscription status
        const { data: subscriptionData } = await supabase
          .from('forum_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .single()

        setIsSubscribed(!!subscriptionData)
      }

      // Increment view count
      await supabase
        .from('forum_topics')
        .update({ view_count: topicData.view_count + 1 })
        .eq('id', topicId)
        .single()
    } catch (error) {
      console.error('Error loading topic:', error)
      router.push('/forums')
    } finally {
      setLoading(false)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !replyContent.trim() || !topic) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          topic_id: topicId,
          author_id: user.id,
          content: replyContent,
          parent_post_id: replyingToPostId || null,
        })
        .select(`
          *,
          author:profiles!forum_posts_author_id_fkey(id, display_name, avatar_url, verification_status)
        `)
        .single()

      if (error) throw error

      // If replying to root topic, add to main posts list
      if (!replyingToPostId) {
        setPosts([...posts, data as any])
      } else {
        // If replying to a post, we'll reload to properly show the nested reply
        // For now, just reload the topic
        await loadTopic()
      }

      setReplyContent('')
      setReplyingToPostId(null)

      // Note: DB triggers will handle updating last_post_at, last_post_by, and reply_count
    } catch (error) {
      console.error('Error posting reply:', error)
      alert('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubscribe() {
    if (!user || !topic) return

    setToggleSubscribing(true)
    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('forum_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('topic_id', topicId)

        if (error) throw error
        setIsSubscribed(false)
      } else {
        // Subscribe
        const { error } = await supabase
          .from('forum_subscriptions')
          .insert({
            user_id: user.id,
            topic_id: topicId,
          })

        if (error) throw error
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('Error toggling subscription:', error)
      alert('Failed to update subscription')
    } finally {
      setToggleSubscribing(false)
    }
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading topic...</p>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Topic not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        {category && (
          <Link href={`/forums/c/${category.slug}`} className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
            ← Back to {category.name}
          </Link>
        )}

        {/* Topic Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{topic.title}</h1>
              <div className="flex flex-wrap gap-2">
                {topic.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">📌 Pinned</span>}
                {topic.is_announcement && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">📢 Announcement</span>}
                {topic.is_locked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🔒 Locked</span>}
              </div>
            </div>
            {user && (
              <button
                onClick={handleSubscribe}
                disabled={toggleSubscribing}
                className={`px-4 py-2 rounded-lg transition font-medium text-sm whitespace-nowrap ml-4 ${
                  isSubscribed
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                {toggleSubscribing ? 'Updating...' : isSubscribed ? '🔔 Subscribed' : '🔕 Subscribe'}
              </button>
            )}
          </div>
          <div className="text-sm text-slate-600">
            <span>{topic.view_count} views</span>
            <span> • </span>
            <span>{topic.reply_count} replies</span>
          </div>
        </div>

        {/* Posts */}
        <div className="mb-8">
          {posts.map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                currentUserId={user?.id}
                topicId={topicId}
                onReply={(postId) => {
                  setReplyingToPostId(postId)
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                }}
                onEdit={(postId, content) => {
                  // Update post in local state
                  setPosts(posts.map(p =>
                    p.id === postId ? { ...p, content } : p
                  ))
                }}
                onDelete={(postId) => {
                  // Remove post from local state
                  setPosts(posts.filter(p => p.id !== postId))
                  // Reload to update counts
                  loadTopic()
                }}
                onLike={(postId, liked) => {
                  // Update user likes set
                  if (liked) {
                    userLikes.add(postId)
                  } else {
                    userLikes.delete(postId)
                  }
                  setUserLikes(new Set(userLikes))
                }}
                userLiked={userLikes.has(post.id)}
                depth={0}
              />

              {/* Nested replies */}
              {post.replies && post.replies.length > 0 && (
                <div className="mt-2">
                  {post.replies.map((reply) => (
                    <PostCard
                      key={reply.id}
                      post={reply}
                      currentUserId={user?.id}
                      topicId={topicId}
                      onReply={(postId) => {
                        setReplyingToPostId(postId)
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                      }}
                      onEdit={() => loadTopic()}
                      onDelete={() => loadTopic()}
                      onLike={() => {}}
                      userLiked={userLikes.has(reply.id)}
                      depth={1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Reply Form */}
        {user && !topic.is_locked ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">
                {replyingToPostId ? 'Reply to post' : 'Reply to this topic'}
              </h3>
              {replyingToPostId && (
                <button
                  onClick={() => setReplyingToPostId(null)}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  ✕ Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleReply} className="space-y-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Share your thoughts..."
                required
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {submitting ? 'Posting...' : replyingToPostId ? 'Post Reply' : 'Post Reply'}
              </button>
            </form>
          </div>
        ) : user && topic.is_locked ? (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 text-center">
            <p className="text-slate-600">This topic is locked. No new replies can be added.</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 text-center">
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in to reply
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
