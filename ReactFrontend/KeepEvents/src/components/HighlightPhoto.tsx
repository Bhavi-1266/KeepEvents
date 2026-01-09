  import type { Photo, Comment, Like } from "../types/photos";
  import type { User } from "../types/user";
  import { DeletePhotos, getComments, getLikes, addComment, deleteComment  ,addView , getViews}  from "../services/Photos";
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

    useEffect(() => {
      const sendView = async () => {
        try {
          await addView(photo.photoid);
        } catch (err) {
          console.error("Error adding view:", err);
        }
      } 

      

      sendView();
    }, [photo.photoid]);

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
    const [isZoomed, setIsZoomed] = useState(false);

    return (
  <div
    onClick={onClick}
    /* Backdrop: Deep black with heavy blur */
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 transition-all"
  >
    {/* Close button */}
    <button
      type="button"
      onClick={onClick}
      className="absolute top-6 right-6 text-white text-4xl font-light hover:scale-110 transition-transform z-10"
    >
      ×
    </button>

    {/* Card - constrained to 90vh */}
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-7xl h-[90vh] bg-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-neutral-800/10"
    >
      {/* Header: Title + Delete */}
      <div className="px-6 py-5 border-b border-black/5 flex items-center justify-between bg-gray-200">
        <div className="flex-1">
          <h2 className="text-xl font-black text-black uppercase tracking-tight"></h2>
          {photo.photoDesc && (
            <p className="text-xs text-black/60 mt-1 line-clamp-1 font-medium uppercase tracking-wider">
              {photo.photoDesc}
            </p>
          )}{
            photo.photoDesc === "" && (
            <p className="text-xs text-black/60 mt-1 line-clamp-1 font-medium uppercase tracking-wider">
              No description provided
            </p>
          )
          }
          
        </div>
        {photo.uploadedBy?.userid === currentUser?.userid && (
          <button
            className="bg-red-600 text-white rounded px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition flex-shrink-0 ml-4"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
      </div>

      {/* Main content grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0">
        
        {/* Left: Image (Deep Black Background) */}
        <div className="lg:col-span-2 bg-black/50 flex items-center justify-center overflow-auto custom-scrollbar">
          {photo.photoFile ? (
            <img
              src={photo.photoFile}
              alt={photo.photoDesc ?? "Photo"}
              onClick={() => setIsZoomed(!isZoomed)}
              className={`object-contain select-none pointer-events-auto transition-transform duration-300 ease-in-out ${
                isZoomed 
                  ? "scale-[2] cursor-zoom-out" 
                  : "max-h-full max-w-full cursor-zoom-in"
              }`}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          ) : (
            <span className="text-neutral-500 font-mono text-xs uppercase">No image</span>
          )}
        </div>

        {/* Right: Details + Likes + Comments */}
        <div className="lg:col-span-1 bg-gray-200 flex flex-col border-l border-neutral-200 overflow-hidden">
          
          {/* Details section */}
          <div className="px-6 py-4 border-b border-neutral-100 flex-shrink-0 overflow-y-auto max-h-1/3 custom-scrollbar">
            <h3 className="text-xs font-black text-black mb-4 uppercase tracking-widest">Info</h3>
            
            <div className="space-y-3 text-xs text-neutral-800">
              {photo.extractedTags && photo.extractedTags.length > 0 && (
                <div>
                  <span className="font-bold block mb-2 text-[10px] uppercase text-neutral-400">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {photo.extractedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 border border-black/10 rounded-sm text-[10px] font-bold text-black uppercase"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-2">
                <div>
                  <span className="font-bold text-[10px] uppercase text-neutral-400 block">Uploaded</span>
                  <span className="font-medium">
                    {photo.uploadDate ? new Date(photo.uploadDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                   <span className="font-bold text-[10px] uppercase text-neutral-400 block">By</span>
                   <span className="font-medium">@{photo.uploadedBy?.username}</span>
                </div>
                
                <div>
                  <span className="font-bold text-[10px] uppercase text-neutral-400 block">Views</span>
                  <span className="font-medium">{photo.viewcount ?? 0}</span>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-neutral-400 block">Downloads</span>
                  <span className="font-medium">{photo.downloadcount ?? 0}</span>
                </div>
                
              </div>

              {photo.event && (
                <div className="pt-1">
                  <span className="font-bold text-[10px] uppercase text-neutral-400 block mb-1">Event</span>
                  <span className="text-black font-medium border-b border-black/10 pb-0.5">
                    {photo.event.eventname}
                  </span>
                </div>
              )}
            </div>

            {photo.FaceCount > 0 && photo.Faces && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <span className="font-bold block mb-2 text-[10px] uppercase text-neutral-400">
                  People in photo ({photo.FaceCount})
                </span>

                <div className="flex flex-wrap gap-1">
                  {photo.Faces.map((face) => (
                    <span
                      key={face.userid}
                      className="px-2 py-1 bg-black/50 text-white rounded-sm text-[10px] font-bold uppercase tracking-wide"
                    >
                      @{face.username}
                    </span>
                  ))}
                </div>

                {photo.HasUserFace && (
                  <div className="mt-2 text-[10px] text-black font-black uppercase tracking-wider underline decoration-2">
                    You are in this photo
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Likes + Comments section */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/50">
            {/* Likes */}
            <div className="px-6 py-3 border-b border-neutral-200/50 flex-shrink-0 bg-gray-200">
              <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                Likes ({likes.length})
              </h4>
            </div>

            <div className="flex-shrink-0 overflow-y-auto px-6 py-3 max-h-[100px] border-b border-neutral-200/50">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {likes.length === 0 && !loadingLikes && (
                  <div className="text-[11px] text-neutral-400 italic">
                    No likes yet
                  </div>
                )}
                {likes.map((like, idx) => (
                  <div
                    key={like.user.username + idx}
                    className="text-[11px] font-bold text-black"
                  >
                    @{like.user.username}
                  </div>
                ))}
                {loadingLikes && (
                  <div className="text-[11px] text-neutral-400 uppercase">
                    Loading…
                  </div>
                )}
                {nextLikesUrl && (
                  <div ref={likesSentinelRef} className="h-4 w-full" />
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="px-6 py-3 border-b border-neutral-200/50 flex-shrink-0 bg-gray-200">
              <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                Comments ({comments.length})
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              <div className="space-y-4 pt-2">
                {comments.length === 0 && !loadingComments && (
                  <div className="text-[11px] text-neutral-400 italic">
                    No comments yet
                  </div>
                )}

                {comments.map((comment) => (
                  <div
                    key={comment.commentText + comment.user.username}
                    className="flex flex-col group border-b border-black/5 pb-2 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                       <div className="text-[10px] font-black text-black uppercase tracking-wide">
                        @{comment.user.username}
                      </div>
                      {currentUser && comment.user.userid === currentUser.userid && (
                        <button
                          onClick={() => setDeleteCommentId(comment.id)}
                          className="text-[9px] text-black font-bold uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete comment"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-neutral-800 break-words leading-relaxed font-medium">
                      {comment.commentText}
                    </div>
                  </div>
                ))}
                {loadingComments && (
                  <div className="text-[11px] text-neutral-400 uppercase">
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
              className="p-4 border-t border-neutral-200 bg-gray-200 flex-shrink-0"
            >
              {commentError && (
                <div className="text-[10px] text-black font-bold uppercase mb-2">
                  {commentError}
                </div>
              )}
              <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-4 py-2 border border-transparent focus-within:border-black/10 transition-colors">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="ADD A COMMENT..."
                  className="flex-1 text-[10px] outline-none bg-transparent text-black placeholder:text-neutral-400 font-bold uppercase tracking-wide"
                  disabled={addingComment}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || addingComment}
                  className="text-[10px] font-black text-black uppercase tracking-widest disabled:opacity-30 hover:underline"
                >
                  {addingComment ? "…" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Delete photo confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="bg-gray-200 rounded-lg p-8 w-full max-w-sm shadow-2xl text-center border border-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-black uppercase tracking-tight mb-2">
              Delete photo?
            </h3>
            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-6 leading-relaxed">
              This action is permanent.<br/>The photo cannot be recovered.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full py-3 rounded bg-black/50 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-60 transition"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                className="w-full py-3 rounded border border-black/10 text-black text-xs font-black uppercase tracking-widest hover:bg-neutral-50 transition"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete comment confirmation modal */}
      {deleteCommentId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="bg-gray-200 rounded-lg p-8 w-full max-w-sm shadow-2xl text-center border border-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-black uppercase tracking-tight mb-6">
              Delete comment?
            </h3>
            <div className="flex gap-3">
               <button
                className="flex-1 py-3 rounded bg-black 50xt-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-60 transition"
                onClick={() => {
                  if (deleteCommentId !== null) {
                    handleDeleteComment(deleteCommentId);
                  }
                }}
                disabled={deletingComment}
              >
                {deletingComment ? "Deleting…" : "Yes"}
              </button>
              <button
                className="flex-1 py-3 rounded border border-black/10 text-black text-xs font-black uppercase tracking-widest hover:bg-neutral-50 transition"
                onClick={() => setDeleteCommentId(null)}
                disabled={deletingComment}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
  }

  export default HighlightPhoto;
