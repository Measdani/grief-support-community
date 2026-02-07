'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ForumPostWithAuthor } from '@/lib/types/forum'
import { createClient } from '@/lib/supabase/client'
import { ReportType, reportTypeLabels } from '@/lib/types/messaging'

interface PostCardProps {
  post: ForumPostWithAuthor
  currentUserId?: string
  topicId: string
  onReply?: (postId: string) => void
  onEdit?: (postId: string, content: string) => void
  onDelete?: (postId: string) => void
  onLike?: (postId: string, liked: boolean) => void
  depth?: number
  userLiked?: boolean
}

export function PostCard({
  post,
  currentUserId,
  topicId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  depth = 0,
  userLiked = false,
}: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [isLiked, setIsLiked] = useState(userLiked)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('inappropriate_content')
  const [reportDescription, setReportDescription] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const supabase = createClient()

  const isAuthor = currentUserId === post.author_id
  const maxDepth = 5

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

  async function handleSaveEdit() {
    if (!editContent.trim()) {
      alert('Post content cannot be empty')
      return
    }

    setIsSubmittingEdit(true)
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          content: editContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      if (error) throw error

      setIsEditing(false)
      if (onEdit) onEdit(post.id, editContent)
    } catch (error) {
      console.error('Error editing post:', error)
      alert('Failed to edit post')
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  async function handleDelete() {
    setShowDeleteConfirm(false)

    try {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      if (onDelete) onDelete(post.id)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  async function handleLike() {
    const newLikeStatus = !isLiked

    try {
      if (newLikeStatus) {
        // Add like
        const { error } = await supabase
          .from('forum_post_likes')
          .insert({
            user_id: currentUserId,
            post_id: post.id,
          })

        if (error) throw error
        setIsLiked(true)
        setLikeCount(likeCount + 1)

        // Update post like_count
        await supabase
          .from('forum_posts')
          .update({ like_count: likeCount + 1 })
          .eq('id', post.id)
      } else {
        // Remove like
        const { error } = await supabase
          .from('forum_post_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)

        if (error) throw error
        setIsLiked(false)
        setLikeCount(Math.max(0, likeCount - 1))

        // Update post like_count
        await supabase
          .from('forum_posts')
          .update({ like_count: Math.max(0, likeCount - 1) })
          .eq('id', post.id)
      }

      if (onLike) onLike(post.id, newLikeStatus)
    } catch (error) {
      console.error('Error updating like:', error)
    }
  }

  async function handleReport() {
    if (!reportDescription.trim()) {
      setReportError('Please provide details about why you are reporting this post')
      return
    }

    setIsSubmittingReport(true)
    setReportError(null)

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentUserId,
          reportable_type: 'post',
          reportable_id: post.id,
          report_type: reportType,
          description: reportDescription,
        })

      if (error) throw error

      alert('Report submitted. Thank you for helping keep our community safe.')
      setShowReportModal(false)
      setReportDescription('')
      setReportType('inappropriate_content')
    } catch (error) {
      console.error('Error submitting report:', error)
      setReportError('Failed to submit report. Please try again.')
    } finally {
      setIsSubmittingReport(false)
    }
  }

  return (
    <div
      style={{
        marginLeft: `${depth * 24}px`,
      }}
      className="mb-4"
    >
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {/* Author Info */}
        <div className="flex gap-4 mb-4">
          <div className="flex-shrink-0">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.display_name || 'Anonymous'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-sm">
                👤
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link
                href={`/profiles/${post.author?.id}`}
                className="font-medium text-slate-900 hover:text-blue-600"
              >
                {post.author?.display_name || 'Anonymous'}
              </Link>
              {post.author?.verification_status !== 'unverified' && (
                <span className="text-xs text-green-600 font-medium">✓</span>
              )}
              <span className="text-xs text-slate-500">{timeAgo(post.created_at)}</span>
              {post.is_edited && (
                <span className="text-xs text-slate-400">(edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Post Content */}
        {isEditing ? (
          <div className="mb-4 space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(post.content)
                }}
                className="px-3 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-700 whitespace-pre-wrap mb-4">{post.content}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 text-sm">
          {/* Like Button */}
          {currentUserId && (
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                isLiked
                  ? 'text-red-600 bg-red-50'
                  : 'text-slate-600 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <span>{isLiked ? '❤️' : '🤍'}</span>
              <span className="text-xs">{likeCount}</span>
            </button>
          )}

          {/* Reply Button */}
          {currentUserId && depth < maxDepth && (
            <button
              onClick={() => onReply?.(post.id)}
              className="text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition text-xs"
            >
              ↳ Reply
            </button>
          )}

          {/* Edit Button */}
          {isAuthor && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition text-xs"
            >
              Edit
            </button>
          )}

          {/* Delete Button */}
          {isAuthor && !isEditing && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition text-xs"
              >
                Delete
              </button>

              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                    <h3 className="font-bold text-slate-900 mb-2">Delete Post?</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      This action cannot be undone. The post will be permanently deleted.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Report Button */}
          {currentUserId && !isAuthor && (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-slate-400 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition text-xs ml-auto"
              title="Report inappropriate content"
            >
              🚩 Report
            </button>
          )}

          {/* Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
                <h3 className="font-bold text-slate-900 mb-4">Report Post</h3>

                {reportError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                    {reportError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason for Report
                    </label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as ReportType)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(reportTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Details (required)
                    </label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Please explain why you're reporting this post..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {reportDescription.length}/500 characters
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleReport}
                      disabled={isSubmittingReport}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                    <button
                      onClick={() => {
                        setShowReportModal(false)
                        setReportDescription('')
                        setReportError(null)
                      }}
                      className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
