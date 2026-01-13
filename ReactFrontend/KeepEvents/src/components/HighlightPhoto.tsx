import type { Photo, Comment, Like } from "../types/photos";
import type { User } from "../types/user";
import { DeletePhotos, getComments, getLikes, addComment, deleteComment, addView } from "../services/Photos";
import { getMe } from "../services/auth";
import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Info, Download } from "lucide-react"; // Import Download icon

interface PhotoHighlightProps {
  photo: Photo;
  currentUser?: { username: string };
  onClick?: () => void;
}

function HighlightPhoto({ photo, onClick }: PhotoHighlightProps) {
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

  const [showMetadata, setShowMetadata] = useState(false);

  const likesSentinelRef = useRef<HTMLDivElement | null>(null);
  const commentsSentinelRef = useRef<HTMLDivElement | null>(null);

  // Parse metadata from JSON string safely
  let metadata: Record<string, any> | null = null;
  try {
    metadata = photo.photoMeta ? JSON.parse(photo.photoMeta) : null;
  } catch (e) {
    console.error("Failed to parse metadata", e);
  }

  useEffect(() => {
    const sendView = async () => {
      try {
        await addView(photo.photoid);
      } catch (err) {
        console.error("Error adding view:", err);
      }
    };
    sendView();
  }, [photo.photoid]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoadingLikes(true);
        setLoadingComments(true);

        const [likesRes, commentsRes] = await Promise.all([
          getLikes({ photoId: photo.photoid }),
          getComments({ photoId: photo.photoid }),
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
      const res = await getLikes({ photoId: photo.photoid, nextUrl: nextLikesUrl });
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
      const res = await getComments({ photoId: photo.photoid, nextUrl: nextCommentsUrl });
      setComments((prev) => [...prev, ...(res.results || [])]);
      setNextCommentsUrl(res.next || null);
    } catch (err) {
      console.error("Error loading more comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [nextCommentsUrl, loadingComments, photo.photoid]);

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

  // --- DOWNLOAD HANDLER ---
  const handleDownload = async () => {
    if (!photo.photoFile) return;

    try {
      
      
      // Fetch the image as a blob to force download instead of opening in tab
      const response = await fetch(photo.photoFile);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Attempt to get extension or default to jpg
      const extension = photo.photoFile.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `photo-${photo.photoid}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started", { id: "downloading" });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image", { id: "downloading" });
      
      // Fallback: just open in new tab if fetch fails (e.g. due to strict CORS)
      window.open(photo.photoFile, '_blank');
    }
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || addingComment) return;

    setAddingComment(true);
    setCommentError("");

    try {
      const Comment = await addComment(newComment.trim(), photo.photoid);

      if (!Comment) {
        throw new Error("Failed to add comment. Please try again.");
      } else {
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
      className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-xl p-4 transition-all duration-300 animate-in fade-in"
    >
      {/* Close Button (Floating) - Orange */}
      <button
        type="button"
        onClick={onClick}
        className="absolute top-6 right-6 group z-[60]"
      >
        <div className="w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 flex items-center justify-center group-hover:bg-orange-600 group-hover:scale-110 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </button>

      {/* Main Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-7xl h-[90vh] 
          bg-white rounded-[2.5rem] 
          shadow-[0_0_60px_-15px_rgba(234,88,12,0.3)] 
          flex flex-col lg:flex-row overflow-hidden 
          border-4 border-white
        "
      >
        
        {/* ================= LEFT: Image Area (Deep Emerald Green) ================= */}
        <div className="lg:w-2/3 h-1/2 lg:h-full bg-emerald-950 relative flex items-center justify-center overflow-hidden group">
            
            {/* Soft decorative gradient behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900 to-emerald-950 z-0" />

            {/* Main Image */}
            <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar p-4 relative z-10">
              {photo.photoFile ? (
                <img
                  src={photo.photoFile}
                  alt={photo.photoDesc ?? "Photo"}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={`transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] select-none drop-shadow-2xl ${
                    isZoomed ? "scale-[2] cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"
                  }`}
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
              ) : (
                <div className="flex flex-col items-center opacity-50 text-emerald-200/50">
                   <span className="text-4xl mb-2">🌿</span>
                   <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>
            
            {/* Floating Controls (Green/Orange theme) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 z-20 shadow-xl">
               <button onClick={handleDownload} className="text-white hover:text-orange-400 transition-colors flex items-center gap-2" title="Download">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
               </button>
               <div className="w-px h-5 bg-white/20"></div>
               <button onClick={() => setIsZoomed(!isZoomed)} className="text-white hover:text-green-400 transition-colors" title="Zoom">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
               </button>
            </div>
        </div>

        {/* ================= RIGHT: Sidebar (White with Orange/Green Accents) ================= */}
        <div className="lg:w-1/3 h-1/2 lg:h-full bg-white flex flex-col relative z-30">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-orange-100 flex-shrink-0 bg-white z-20">
             <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-emerald-950 leading-snug break-words">
                    {photo.photoDesc || <span className="text-emerald-800/40 italic font-normal">Untitled Memory</span>}
                  </h3>
                  {photo.event && (
                    <div className="mt-2 flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded bg-orange-100 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                         {photo.event.eventname}
                       </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                   {/* Metadata Toggle */}
                   {metadata && (
                    <div 
                      className="relative group/meta"
                      onMouseEnter={() => setShowMetadata(true)}
                      onMouseLeave={() => setShowMetadata(false)}
                    >
                      <button className="w-9 h-9 rounded-full bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </button>
                      
                      {/* Metadata Popup */}
                      <div
                        className={`absolute top-full right-0 mt-2 w-80 max-h-[500px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(22,163,74,0.3)] border border-green-100 z-50 transition-all duration-200 origin-top-right overflow-hidden ${
                          showMetadata ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                        }`}
                      >
                         <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Image Data</span>
                         </div>
                         <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
                           {Object.entries(metadata).map(([sectionKey, sectionValue]) => {
                              let sectionData = sectionValue;
                              if (typeof sectionValue === 'string') {
                                try { sectionData = JSON.parse(sectionValue); } 
                                catch (e) { sectionData = { value: sectionValue }; }
                              }
                              if (!sectionData || (typeof sectionData === 'object' && Object.keys(sectionData).length === 0)) return null;

                              return (
                                <div key={sectionKey} className="border-b border-green-50 last:border-0 p-4 hover:bg-green-50/30 transition-colors">
                                  <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-2">
                                    {sectionKey}
                                  </h4>
                                  <div className="space-y-1.5">
                                    {typeof sectionData === 'object' ? (
                                      Object.entries(sectionData).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-start gap-3">
                                          <span className="text-[9px] text-emerald-800/50 font-bold uppercase tracking-wide shrink-0">{k}</span>
                                          <span className="text-[10px] font-medium text-emerald-900 text-right break-all">
                                            {Array.isArray(v) ? v.join(', ') : String(v)}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-[10px] font-medium text-emerald-900 break-all">{String(sectionData)}</div>
                                    )}
                                  </div>
                                </div>
                              );
                           })}
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Button */}
                  {photo.uploadedBy?.userid === currentUser?.userid && (
                    <button
                      onClick={() => { setShowMetadata(false); setConfirmDelete(true); }}
                      className="w-9 h-9 rounded-full bg-orange-50 hover:bg-red-50 text-orange-400 hover:text-red-500 flex items-center justify-center transition-colors"
                      title="Delete Photo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
             </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
               <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-1">Uploaded By</span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-[8px] font-black text-white">
                      {photo.uploadedBy?.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-emerald-900">@{photo.uploadedBy?.username}</span>
                  </div>
               </div>
               <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-1">Date</span>
                  <span className="text-xs font-bold text-emerald-900">
                    {photo.uploadDate ? new Date(photo.uploadDate).toLocaleDateString() : "—"}
                  </span>
               </div>
               <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-1">Views</span>
                  <span className="text-xs font-bold text-emerald-900">{photo.viewcount ?? 0}</span>
               </div>
               <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-1">People</span>
                  <span className="text-xs font-bold text-emerald-900">{photo.FaceCount ?? 0}</span>
               </div>
            </div>

            {/* Tags & Faces */}
            {((photo.extractedTags && photo.extractedTags.length > 0) || photo.FaceCount > 0) && (
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">Tags & People</h4>
                 <div className="flex flex-wrap gap-2">
                  {photo.extractedTags?.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-white border border-green-200 rounded-full text-[10px] font-black uppercase text-green-700 shadow-sm hover:border-green-400 cursor-default transition-colors">
                      #{tag}
                    </span>
                  ))}
                  {photo.Faces?.map((face) => (
                    <span key={face.userid} className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-[10px] font-black uppercase text-orange-700 flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      @{face.username}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full h-px bg-orange-100" />

            {/* Likes Section */}
            <div className="space-y-3">
               <h4 className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em] flex items-center gap-2">
                 <span>Likes ({likes.length})</span>
                 <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
               </h4>
               
               <div className="flex flex-wrap gap-x-2 gap-y-1">
                 {likes.length === 0 && !loadingLikes && (
                   <span className="text-xs text-emerald-800/40 italic">No likes yet.</span>
                 )}
                 {likes.map((like, idx) => (
                    <span key={like.user.username + idx} className="text-xs font-bold text-emerald-800 hover:text-orange-500 cursor-pointer transition-colors">
                      @{like.user.username}{idx < likes.length - 1 ? ',' : ''}
                    </span>
                 ))}
                 {nextLikesUrl && <div ref={likesSentinelRef} className="h-4 w-full" />}
               </div>
            </div>

            <div className="w-full h-px bg-orange-100" />

            {/* Comments Section */}
            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">
                 Comments ({comments.length})
               </h4>
               
               <div className="space-y-4">
                 {comments.length === 0 && !loadingComments && (
                   <div className="text-center py-6 bg-green-50/50 rounded-xl border border-dashed border-green-200">
                      <p className="text-xs text-green-700/50 font-bold uppercase tracking-wide">No comments yet</p>
                   </div>
                 )}
                 
                 {comments.map((comment) => (
                   <div key={comment.id} className="group flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                     <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center text-[10px] font-black text-emerald-600 border border-green-100 shadow-sm">
                        {comment.user.username.charAt(0).toUpperCase()}
                     </div>
                     <div className="flex-1 bg-white rounded-2xl rounded-tl-none p-3 relative border border-green-50 shadow-sm group-hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wide">@{comment.user.username}</span>
                           {currentUser && comment.user.userid === currentUser.userid && (
                            <button 
                              onClick={() => setDeleteCommentId(comment.id)} 
                              className="text-emerald-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                              title="Delete Comment"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                           )}
                        </div>
                        <p className="text-xs text-emerald-800 font-medium leading-relaxed">{comment.commentText}</p>
                     </div>
                   </div>
                 ))}
                 {nextCommentsUrl && <div ref={commentsSentinelRef} className="h-6 w-full flex items-center justify-center">
                    {loadingComments && <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>}
                 </div>}
               </div>
            </div>
          </div>

          {/* Add Comment Input */}
          <div className="p-4 border-t border-orange-100 bg-white z-30">
            <form onSubmit={handleAddComment} className="relative group/form">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-orange-50/50 border border-orange-100 rounded-full pl-5 pr-14 py-3.5 text-xs font-bold text-emerald-900 outline-none focus:bg-white focus:border-orange-300 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-orange-300"
                disabled={addingComment}
              />
              <button 
                type="submit" 
                disabled={!newComment.trim() || addingComment}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 rounded-full flex items-center justify-center text-white transition-all shadow-md shadow-orange-500/20 hover:scale-105"
              >
                 {addingComment ? (
                   <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                 ) : (
                   <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                 )}
              </button>
            </form>
          </div>
        </div>

        {/* ================= MODALS ================= */}
        
        {/* Delete Photo Confirmation */}
        {confirmDelete && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-red-100 text-center scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-xl font-black text-emerald-950 mb-2 tracking-tight">Delete this memory?</h3>
              <p className="text-sm text-emerald-800/60 mb-8 font-medium">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 py-3.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-black uppercase tracking-wider hover:bg-stone-200 transition-colors" 
                  onClick={() => setConfirmDelete(false)} 
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:scale-105" 
                  onClick={handleDelete} 
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Comment Confirmation */}
        {deleteCommentId !== null && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-200">
             <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-stone-100 text-center scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-black text-emerald-950 mb-6 tracking-tight">Remove comment?</h3>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                  onClick={() => deleteCommentId !== null && handleDeleteComment(deleteCommentId)}
                  disabled={deletingComment}
                >
                  {deletingComment ? "..." : "Yes"}
                </button>
                <button 
                  className="flex-1 py-3.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-black uppercase tracking-wider hover:bg-stone-200 transition-colors" 
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