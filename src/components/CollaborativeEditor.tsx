/**
 * Collaborative Editor Component
 *
 * Real-time collaborative editing UI with:
 * - Live cursor tracking
 * - Active presence indicators
 * - Comments and mentions
 * - Lock indicators
 * - Conflict resolution UI
 */

import { useState, useRef, useEffect } from "react";
import {
  CheckIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  LockClosedIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCollaborativeEditor } from "../hooks/useCollaborativeEditor";

interface CollaborativeEditorProps {
  documentId: string;
  userId: string;
  userName: string;
  initialContent?: any;
  onSave?: (content: any) => void;
}

export default function CollaborativeEditor({
  documentId,
  userId,
  userName,
  initialContent,
  onSave,
}: CollaborativeEditorProps) {
  const {
    content,
    isLoading,
    error,
    cursors,
    presences,
    comments,
    updateContent,
    updateCursor,
    addComment,
    mentionUser,
    requestLock,
    releaseLock,
    isPathLocked,
    getCommentsForPath,
    getOtherUsers,
  } = useCollaborativeEditor(documentId, userId, userName);

  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [commentPath, setCommentPath] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const otherUsers = getOtherUsers();

  const handleEdit = (path: string) => {
    if (isPathLocked(path)) {
      alert("This field is locked by another user");
      return;
    }

    setEditingPath(path);
    requestLock(path);
  };

  const handleSaveEdit = (value: string) => {
    if (editingPath) {
      updateContent(editingPath, value);
      releaseLock(editingPath);
      setEditingPath(null);
    }
  };

  const handleAddComment = () => {
    if (commentPath && commentContent.trim()) {
      addComment(commentPath, commentContent);

      // Mention selected users
      for (const userId of selectedUsers) {
        mentionUser(userId, `${userName} mentioned you in a comment`, undefined);
      }

      setCommentContent("");
      setSelectedUsers([]);
      setCommentPath(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 mt-4">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 font-semibold">Error loading document</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Collaborative Editor
              </h1>
              <p className="text-sm text-gray-600 mt-1">Document ID: {documentId}</p>
            </div>

            {/* Active Users */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {presences.length} editing
                </span>
              </div>

              <div className="flex -space-x-2">
                {presences.map((presence) => (
                  <div
                    key={presence.clientId}
                    className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-blue-600"
                    title={presence.userName}
                  >
                    {presence.userName.substring(0, 1)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div ref={editorRef} className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Document Content */}
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              {content && typeof content === "object" ? (
                Object.entries(content).map(([key, value]) => (
                  <div key={key} className="relative">
                    {/* Label */}
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key}
                      {isPathLocked(key) && (
                        <LockClosedIcon className="w-4 h-4 inline-block ml-2 text-yellow-500" />
                      )}
                    </label>

                    {/* Editable Field */}
                    {editingPath === key ? (
                      <div className="flex gap-2">
                        <textarea
                          autoFocus
                          defaultValue={String(value)}
                          onBlur={(e) => handleSaveEdit(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                              handleSaveEdit(e.currentTarget.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <button
                          onClick={() => {
                            releaseLock(key);
                            setEditingPath(null);
                          }}
                          className="mt-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleEdit(key)}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer transition"
                      >
                        <p className="text-gray-900">{String(value)}</p>
                      </div>
                    )}

                    {/* Comments */}
                    <div className="mt-2">
                      {getCommentsForPath(key).map((comment) => (
                        <div
                          key={comment.id}
                          className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {comment.author}
                              </p>
                              <p className="text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {commentPath === key ? (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <textarea
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />

                          {/* Mention Users */}
                          <div className="mb-2">
                            <label className="text-xs font-medium text-gray-700">
                              Mention:
                            </label>
                            <div className="flex gap-2 mt-1">
                              {otherUsers.map((user) => (
                                <button
                                  key={user.userId}
                                  onClick={() => {
                                    setSelectedUsers(
                                      selectedUsers.includes(user.userId)
                                        ? selectedUsers.filter(
                                            (id) => id !== user.userId
                                          )
                                        : [...selectedUsers, user.userId]
                                    );
                                  }}
                                  className={`px-2 py-1 text-xs rounded ${
                                    selectedUsers.includes(user.userId)
                                      ? "bg-blue-600 text-white"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                >
                                  @{user.userName}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={handleAddComment}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Post
                            </button>
                            <button
                              onClick={() => {
                                setCommentPath(null);
                                setCommentContent("");
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentPath(key)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <ChatBubbleLeftIcon className="w-3 h-3" />
                          Add comment
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">Loading content...</p>
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => onSave?.(content)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Cursors & Presence */}
      <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Active Users</h2>

        <div className="space-y-3">
          {presences.map((presence) => (
            <div
              key={presence.clientId}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      cursors[presence.clientId]?.color || "#000000",
                  }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {presence.userName}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Status: {presence.status}
              </p>
              {presence.cursorPosition > 0 && (
                <p className="text-xs text-gray-600">
                  Position: {presence.cursorPosition}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Comments Section */}
        {comments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Comments ({comments.length})
            </h2>

            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded text-xs"
                >
                  <p className="font-medium text-gray-900">{comment.author}</p>
                  <p className="text-gray-700 mt-1 line-clamp-2">
                    {comment.content}
                  </p>
                  <p className="text-gray-500 mt-1">
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
