  import type { Photo, Comment, Like } from "../types/photos";
  import type { User } from "../types/user";
  import { DeletePhotos, getComments, getLikes, addComment, deleteComment } from "../services/Photos";
  import  { getMe} from "../services/auth";
  import { useState, useEffect, useRef, useCallback } from "react";
  import type { FormEvent } from "react";
  import { useNavigate } from "react-router-dom";
  import toast from "react-hot-toast";
  interface PhotoHighlightProps {
    photo: Photo;
    currentUser?: { username: string }; // Pass current logged-in user
    onClick?: () => void; // close modal
  }

  function HighlightPhoto({ photo , onClick }: PhotoHighlightProps) {

    const navigate = useNavigate(); 
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteCommentId, setDeleteCommentId] = useState<number | null>(null);
    const [deletingComment, setDeletingComment] = useState(false);

    const [likes, setLikes] = useState<Like[]>([]);
    const [nextLikesUrl, setNextLikesUrl] = useState<string | null>(null);
    const [loadingLikes, setLoadingLikes] = useState(false);

    const [comments, setComments] = useState<Comment[]>([]);
    const [nextCommentsUrl, setNextCommentsUrl] = useState<string | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);

    const [newComment, setNewComment] = useState("");
    const [addingComment, setAddingComment] = useState(false);
    const [commentError, setCommentError] = useState("");

    const likesSentinelRef = useRef<HTMLDivElement | null>(null);
    const commentsSentinelRef = useRef<HTMLDivElement | null>(null);

    // Initial fetch
    useEffect(() => {
      let cancelled = false;

      const fetchData = async () => {
        try {
          setLoadingLikes(true);
          setLoadingComments(true);

          const [likesRes, commentsRes] = await Promise.all([
            getLikes({photoId : photo.photoid}),
            getComments({photoId :  photo.photoid}),
          ]);


          const me = await getMe();
          setCurrentUser(me.user);

          

          if (cancelled) return;

          setLikes(likesRes.results || []);
          setNextLikesUrl(likesRes.next || null);

          setComments(commentsRes.results || []);
          setNextCommentsUrl(commentsRes.next || null);
        } catch (err) {
          console.error("Error fetching likes/comments:", err);
          if (!cancelled) {
            setLikes([]);
            navigate("/");
            setComments([]);
          }
        } finally {
          if (!cancelled) {
            setLoadingLikes(false);
            setLoadingComments(false);

          }
        }
      };

      fetchData();

      return () => {
        cancelled = true;
      };
    }, [photo.photoid]);

    const loadMoreLikes = useCallback(async () => {
      if (!nextLikesUrl || loadingLikes) return;
      setLoadingLikes(true);
      try {
        const res = await getLikes({ photoId : photo.photoid, nextUrl: nextLikesUrl });
        setLikes((prev) => [...prev, ...(res.results || [])]);
        setNextLikesUrl(res.next || null);
      } catch (err) {
        console.error("Error loading more likes:", err);
      } finally {
        setLoadingLikes(false);
      }
    }, [nextLikesUrl, loadingLikes, photo.photoid]);

    const loadMoreComments = useCallback(async () => {
      if (!nextCommentsUrl || loadingComments) return;
      setLoadingComments(true);
      try {
        const res = await getComments({ photoId : photo.photoid, nextUrl: nextCommentsUrl});
        setComments((prev) => [...prev, ...(res.results || [])]);
        setNextCommentsUrl(res.next || null);
      } catch (err) {
        console.error("Error loading more comments:", err);
      } finally {
        setLoadingComments(false);
      }
    }, [nextCommentsUrl, loadingComments, photo.photoid]);

    // IntersectionObserver for likes
    useEffect(() => {
      if (!nextLikesUrl) return;
      const target = likesSentinelRef.current;
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            loadMoreLikes();
          }
        },
        { root: null, rootMargin: "0px", threshold: 0.1 }
      );

      observer.observe(target);
      return () => observer.disconnect();
    }, [nextLikesUrl, loadMoreLikes]);

    // IntersectionObserver for comments
    useEffect(() => {
      if (!nextCommentsUrl) return;
      const target = commentsSentinelRef.current;
      if (!target) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            loadMoreComments();
          }
        },
        { root: null, rootMargin: "0px", threshold: 0.1 }
      );

      observer.observe(target);
      return () => observer.disconnect();
    }, [nextCommentsUrl, loadMoreComments]);

    const handleDelete = async () => {
      if (!photo.photoid) return;
      setDeleting(true);
      try {
        await DeletePhotos([photo.photoid]);
        onClick?.();
      } catch (err) {
        console.error(err);
      } finally {
        setDeleting(false);
        setConfirmDelete(false);
      }
    };

    const handleAddComment = async (e: FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() || addingComment) return;

      setAddingComment(true);
      setCommentError("");

      try {
        console.log(photo.photoid);
        const  Comment  = await addComment(newComment.trim(), photo.photoid);
        
        if (!Comment) {
          throw new Error("Failed to add comment. Please try again.");
        }
        else{
            
        setComments((prev) => [Comment, ...prev]);
        setNewComment("");
        }
      } catch (err: any) {
        console.error("Error adding comment:", err);
        setCommentError(err.message || "Failed to add comment. Please try again.");
      } finally {
        setAddingComment(false);
      }
    };

    const handleDeleteComment = async (commentId: number) => {
      setDeletingComment(true);
      try {
        await deleteComment(commentId);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setDeleteCommentId(null);
      } catch (err) {
        console.error("Error deleting comment:", err);
        toast.error("Failed to delete comment. Please try again.");
      } finally {
        setDeletingComment(false);
      }
    };

    return (
      <div
        onClick={onClick}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClick}
          className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-10"
        >
          ×
        </button>

        {/* Card - constrained to 90vh with proper layout */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header: Title + Delete */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-neutral-100">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-neutral-900">Photo</h2>
              {photo.photoDesc && (
                <p className="text-sm text-neutral-600 mt-1 line-clamp-1">
                  {photo.photoDesc}
                </p>
              )}
            </div>
            <button
              className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 transition flex-shrink-0 ml-4"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          </div>

          {/* Main content grid */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left: Image (takes 2 cols on lg) */}
            <div className="lg:col-span-2 bg-neutral-900 flex items-center justify-center overflow-auto">
              {photo.photoFile ? (
                <img
                  src={photo.photoFile}
                  alt={photo.photoDesc ?? "Photo"}
                  className="max-h-full max-w-full object-contain select-none pointer-events-auto"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
              ) : (
                <span className="text-neutral-500">No image</span>
              )}
            </div>

            {/* Right: Details + Likes + Comments (stacked) */}
            <div className="lg:col-span-1 bg-neutral-50 flex flex-col border-l border-neutral-200 overflow-hidden">
              {/* Details section */}
              <div className="px-4 py-2  border-b border-neutral-200 flex-shrink-0 overflow-y-auto max-h-1/3">
                <h3 className="text-sm font-bold text-neutral-900 mb-3">Info</h3>
                
                <div className="space-y-2  text-xs text-neutral-700">
                  {photo.extractedTags && photo.extractedTags.length > 0 && (
                    <div>
                      <span className="font-semibold block mb-1">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {photo.extractedTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-neutral-200 rounded-full text-[10px] text-neutral-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Uploaded:</span>{" "}
                    {photo.uploadDate
                      ? new Date(photo.uploadDate).toLocaleDateString()
                      : "—"}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Likes:</span>
                    <span>{photo.likes ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Views:</span>
                    <span>{photo.viewcount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Downloads:</span>
                    <span>{photo.downloadcount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Comments:</span>
                    <span>{photo.commentcount ?? 0}</span>
                  </div>

                  {photo.uploadedBy && (
                    <div>
                      <span className="font-semibold block mb-1">By:</span>
                      <span className="text-neutral-600">
                        @{photo.uploadedBy.username}
                      </span>
                    </div>
                  )}

                  {photo.event && (
                    <div>
                      <span className="font-semibold block mb-1">Event:</span>
                      <span className="text-neutral-600">
                        {photo.event.eventname}
                      </span>
                    </div>
                  )}

                  
                </div>

                {photo.FaceCount > 0 && photo.Faces && (
                  <div>
                    <span className="font-semibold block mb-1">
                      People in photo ({photo.FaceCount}):
                    </span>

                    <div className="flex flex-wrap gap-1">
                      {photo.Faces.map((face) => (
                        <span
                          key={face.userid}
                          className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-medium"
                        >
                          @{face.username}
                        </span>
                      ))}
                    </div>

                    {photo.HasUserFace && (
                      <div className="mt-1 text-[10px] text-green-600 font-semibold">
                        You are in this photo
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Likes + Comments section */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Likes */}
                <div className="px-4 py-3 border-b border-neutral-200 flex-shrink-0">
                  <h4 className="text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wide">
                    Likes ({likes.length})
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="space-y-1">
                    {likes.length === 0 && !loadingLikes && (
                      <div className="text-[11px] text-neutral-400">
                        No likes yet
                      </div>
                    )}
                    {likes.map((like, idx) => (
                      <div
                        key={like.user.username + idx}
                        className="text-xs text-neutral-700"
                      >
                        @{like.user.username}
                      </div>
                    ))}
                    {loadingLikes && (
                      <div className="text-[11px] text-neutral-400">
                        Loading…
                      </div>
                    )}
                    {nextLikesUrl && (
                      <div ref={likesSentinelRef} className="h-4 w-full" />
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div className="px-4 py-3 border-b border-neutral-200 flex-shrink-0">
                  <h4 className="text-xs font-bold text-neutral-900 mb-0 uppercase tracking-wide">
                    Comments ({comments.length})
                  </h4>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-2">
                  <div className="space-y-2">
                    {comments.length === 0 && !loadingComments && (
                      <div className="text-[11px] text-neutral-400">
                        No comments yet
                      </div>
                    )}

                    {comments.map((comment) => (
                      <div
                        key={comment.commentText + comment.user.username}
                        className="flex items-start justify-between gap-2 p-2 hover:bg-neutral-100 rounded transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-neutral-900 truncate">
                            @{comment.user.username} ; {comment.id}
                          </div>
                          <div className="text-sm text-neutral-700 mt-0.5 break-words">
                            {comment.commentText}
                          </div>
                        </div>

                        {/* Delete button - only for current user's comments */}
                        {currentUser && comment.user.userid === currentUser.userid && (
                          <button
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0 self-start"
                            title="Delete comment"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {loadingComments && (
                      <div className="text-[11px] text-neutral-400">
                        Loading…
                      </div>
                    )}
                    {nextCommentsUrl && (
                      <div ref={commentsSentinelRef} className="h-4 w-full" />
                    )}
                  </div>
                </div>

                {/* Add comment input */}
                <form
                  onSubmit={handleAddComment}
                  className="px-3 py-3 border-t border-neutral-200 bg-neutral-100 flex-shrink-0"
                >
                  {commentError && (
                    <div className="text-xs text-red-600 mb-2">
                      {commentError}
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-neutral-300">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 text-xs outline-none bg-transparent text-neutral-800 placeholder:text-neutral-400"
                      disabled={addingComment}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addingComment}
                      className="text-xs font-semibold text-blue-600 disabled:text-neutral-300 hover:text-blue-700"
                    >
                      {addingComment ? "…" : "Post"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Delete photo confirmation modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Delete photo?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This action is <strong>permanent</strong>. The photo cannot
                be recovered.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded border"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete comment confirmation modal */}
        {deleteCommentId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Delete comment?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded border"
                  onClick={() => setDeleteCommentId(null)}
                  disabled={deletingComment}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={() => {
                    if (deleteCommentId !== null) {
                      handleDeleteComment(deleteCommentId);
                    }
                  }}
                  disabled={deletingComment}
                >
                  {deletingComment ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default HighlightPhoto;
