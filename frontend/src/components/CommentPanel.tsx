import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Loader2, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { supabaseUrl } from '../lib/supabase';

interface Comment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  resolved_at?: string;
}

interface CommentThread {
  id: string;
  repository_url: string;
  owner_id?: string;
  team_id?: string;
  created_at: string;
}

interface CommentPanelProps {
  repositoryUrl: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  repositoryUrl,
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [thread, setThread] = useState<CommentThread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadCommentThread();
  }, [isOpen, repositoryUrl]);

  const getAuthToken = () => {
    const token = localStorage.getItem('sb-token');
    if (!token) {
      setError('Authentication required');
      return null;
    }
    return token;
  };

  const loadCommentThread = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/comment-thread?repository_url=${encodeURIComponent(repositoryUrl)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load thread');
      const result = await response.json();
      if (result.success) {
        setThread(result.data);
        loadComments(result.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (threadId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/comments?thread_id=${threadId}&limit=50`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load comments');
      const result = await response.json();
      if (result.success) {
        setComments(result.data);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !thread) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${supabaseUrl}/functions/v1/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: thread.id,
          body: newComment.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to post comment');
      const result = await response.json();
      if (result.success) {
        setComments([...comments, result.data]);
        setNewComment('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingBody.trim()) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${supabaseUrl}/functions/v1/comments`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: commentId,
          body: editingBody.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update comment');
      const result = await response.json();
      if (result.success) {
        setComments(comments.map(c => c.id === commentId ? result.data : c));
        setEditingId(null);
        setEditingBody('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${supabaseUrl}/functions/v1/comments`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: commentId }),
      });

      if (!response.ok) throw new Error('Failed to delete comment');
      setComments(comments.map(c => c.id === commentId ? { ...c, deleted_at: new Date().toISOString() } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeComments = comments.filter(c => !c.deleted_at);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-white shadow-xl flex flex-col max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Discussions</h2>
              <p className="text-xs text-gray-500">{activeComments.length} comments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-gap gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-900 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && activeComments.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : activeComments.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            activeComments.map(comment => (
              <div
                key={comment.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-purple-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        disabled={loading}
                        className="flex-1 px-2 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingBody('');
                        }}
                        className="flex-1 px-2 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-medium text-gray-600">
                        {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString()}
                      </p>
                      {currentUserId === comment.author_id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditingBody(comment.body);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{comment.body}</p>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={loading}
          />
          <button
            onClick={handlePostComment}
            disabled={loading || !newComment.trim()}
            className="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Comment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
