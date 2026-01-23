import { useEffect, useState, useRef, useCallback } from "react"; 
import { useNavigate } from "react-router-dom";

import NavBar from "../components/navBar";
import PhotoCard from "../components/PhotoCard";
import EventCard from "../components/EventCard";
import HighlightPhoto from "../components/HighlightPhoto";
import SelectionBar from "../components/selectionBar";
import PhotoCardMinimal from "../components/LikesCard";
import LikesCard from "../components/LikesCard";
import CommentsCard from "../components/CommentsCard";
import { toast } from "react-hot-toast";

import { getMe } from "../services/auth";
import { getAllPhotos, getSearchedFilteredSortedPhotos, getNextSetPhotos, DeletePhotos  , getLikes, getComments} from "../services/Photos";
import { GetAllEvents, getSearchedFilteredSortedEvents } from "../services/events";
import type { User } from "../types/user";
import type { Photo , Like , Comment } from "../types/photos";
import type { Event } from "../types/event";

import { useWebSocket } from "../contexts/WebSocketContext";

import JSZip from "jszip";

function HomePage() {
  const navigate = useNavigate();

  // User & Auth
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<number>(3);

  // Photos - Trending + Recent + Infinite scroll
  const [trendingPhotos, setTrendingPhotos] = useState<Photo[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [recentNextUrl, setRecentNextUrl] = useState<string | null>(null);
  const recentSentinelRef = useRef<HTMLDivElement | null>(null);

  // Events
  const [events, setEvents] = useState<Event[]>([]);
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([]);

  // My Activity
  const [myLikes, setMyLikes] = useState<Like[]>([]);
  const [myComments, setMyComments] = useState<Comment[]>([]);

  // Selection & Modals
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters (for dedicated pages)
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [startingDate, setStartingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [filterApplied, setFilterApplied] = useState(false);

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollAccumulator = useRef(0); // To handle sub-pixel scrolling for smoothness

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationFrameId: number;

    const animate = () => {
      if (!isPaused && container) {
        // Adjust speed here (0.5 is slow and smooth, 1 is standard, 2 is fast)
        scrollAccumulator.current += 0.5; 
        
        // Only update DOM if the integer value changes to avoid layout thrashing
        if (scrollAccumulator.current >= 1) {
          container.scrollLeft += Math.floor(scrollAccumulator.current);
          scrollAccumulator.current -= Math.floor(scrollAccumulator.current);
        }

        // Optional: Infinite Loop Logic (Reset to 0 when end reached)
        // If you want it to stop at the end, remove this if block.
        if (
          container.scrollLeft + container.clientWidth >=
          container.scrollWidth - 1
        ) {
           // Uncomment line below to loop back to start immediately
           // container.scrollLeft = 0; 
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, recentPhotos]); // Re-run if photos change to ensure smooth continuation
  const { subscribe } = useWebSocket();
  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        const me = await getMe();
        setUser(me.user);
        setUserRole(me.user.groups[0] || 3);

        // Load trending (fixed grid)
        const trending = await getAllPhotos({ ordering: "-likes", limit: 8, offset: 0 });
        setTrendingPhotos(trending.results || []);

        // Load recent + pagination setup
        const recent = await getAllPhotos({ ordering: "-uploadDate", limit: 12, offset: 0 });
        setRecentPhotos(recent.results || []);
        setRecentNextUrl(recent.next || null);

        // Load events & favorites
        const ev = await GetAllEvents({ limit: 12, ordering: "-eventdate", offset: 0 });
        setEvents(ev.results || []);
        // Mock favorites - replace with your API
        setFavoriteEvents(ev.results?.slice(0, 4) || []);

        // My Activity - replace with your actual APIs
        const myLikesData = await getLikes({ 
          limit: 6, 
          offset: 0,
          ordering: "-likes", 
          // Add user filter if your service supports it
            filters: { user: me.user.userid } 
        });
        setMyLikes(myLikesData.results?.slice(0, 4) || []);

        // ✅ FIXED: My Comments (user-filtered)
        const myCommentsData = await getComments({ 
          photoId: 0, // Dummy - gets ALL comments
          filters: { user: me.user.userid }, // Your user filter
          limit: 4,
          ordering: "-commentedAt"
        });
        setMyComments(myCommentsData.results || []);
      
      } catch (err: any) {
        if (err.message?.includes("401") || err.message?.includes("403")) {
          navigate("/", { replace: true });
        } else {
          setError("Failed to load data");
          navigate("/", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  // Infinite scroll for recent photos
  useEffect(() => {
    if (!recentSentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && recentNextUrl) {
          loadMoreRecent();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(recentSentinelRef.current);
    return () => observer.disconnect();
  }, [recentNextUrl, loadingMore]);


  
  
      
  
      // ✅ Subscribe to photo likes
      useEffect(() => {
        if (!user) return;
  
        const unsubscribe = subscribe("photo_liked", (data) => {
          if (data.userid !== user.userid) return;
          if (data.likedById == user.userid) return;
          toast.success(`${data.likedBy  } liked your photo`);
        });
  
        return () => {
          unsubscribe();
        };
      } , [user?.userid]); // Only resubscribe if userId changes

      useEffect(() => {
        if (!user) return;
  
        const unsubscribe = subscribe("comment_added", (data) => {
          if (data.userid !== user.userid) return;
          if (data.commentedBy == user.username) return;
          toast.success(`${data.commentedBy  } commented ${data.comment}`);
        });
  
        return () => {  
          unsubscribe();
        };
      } , [user?.userid]); // Only resubscribe if userId changes
  // ✅ Bulk Download Handler (Fixed for HomePage)
  // ✅ Bulk Download as ZIP (Single File, No Multiple Prompts)
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    const zip = new JSZip();
    
    // 1. Combine and filter photos
    const allOnScreenPhotos = [...trendingPhotos, ...recentPhotos];
    const uniquePhotos = new Map(allOnScreenPhotos.map(p => [p.photoid, p]));
    const photosToDownload = Array.from(uniquePhotos.values()).filter(p => selectedIds.has(p.photoid));

    toast.success(`Preparing ${photosToDownload.length} photos for download...`);

    // 2. Fetch all images and add to ZIP
    const downloadPromises = photosToDownload.map(async (photo) => {
      try {
        const imageUrl = photo.photoFile ;
        if (!imageUrl) return;

        // Fetch the image data
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Get extension (jpg/png)
        const ext = blob.type.split('/')[1] || 'jpg';
        const filename = `photo-${photo.photoid}.${ext}`;

        // Add to zip folder
        zip.file(filename, blob);
      } catch (err) {
        console.error(`Failed to load photo ${photo.photoid}`, err);
      }
    });

    // Wait for all downloads to finish fetching
    await Promise.all(downloadPromises);

    // 3. Generate the zip file and trigger ONE download
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = window.URL.createObjectURL(content);

      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `event-photos-${new Date().toISOString().slice(0,10)}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(zipUrl);
      toast.success("Photos downloaded successfully!");
      
      handleClear(); // Uncomment if you want to clear selection after
    } catch (err) {
      toast.error("Failed to create zip file");
    }
  };
  const loadMoreRecent = async () => {
    if (loadingMore || !recentNextUrl) return;
    setLoadingMore(true);
    try {
      const data = await getNextSetPhotos(recentNextUrl);
      setRecentPhotos(prev => [...prev, ...(data.results || [])]);
      setRecentNextUrl(data.next || null);
    } catch (err: any) {
      setError("Failed to load more photos");
    } finally {
      setLoadingMore(false);
    }
  };

  // Selection handlers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleClear = () => setSelectedIds(new Set());

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await DeletePhotos([...selectedIds]);
      const deletedCount = res.deleted?.length ?? 0;
      
      toast.success(`Deleted ${deletedCount} photo${deletedCount > 1 ? "s" : ""}`);
      setRecentPhotos(prev => prev.filter(p => !res.deleted?.includes(p.photoid)));
      setTrendingPhotos(prev => prev.filter(p => !res.deleted?.includes(p.photoid)));
      setMyLikes(prev => prev.filter(p => !res.deleted?.includes(p.Photo.photoid)));
      handleClear();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

// 1. Loading State
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          {/* Colorful Spinner */}
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ffb366] rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Loading Dashboard
          </p>
        </div>
      </div>
    );
    
  if (!user) return null;

  // 2. Main Dashboard
  return (
    <div className="relative min-h-screen w-full bg-white font-sans overflow-hidden text-slate-800">
      
      {/* --- Background Aesthetics --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(40px, -40px) scale(1.1) rotate(5deg); }
          66% { transform: translate(-30px, 30px) scale(0.9) rotate(-5deg); }
        }
        .animate-float-1 { animation: float 20s infinite ease-in-out; }
        .animate-float-2 { animation: float 25s infinite ease-in-out -5s; }
        .animate-float-3 { animation: float 28s infinite ease-in-out -10s; }
        .animate-float-4 { animation: float 32s infinite ease-in-out -15s; }
        
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
        
        /* Hide Scrollbar but keep functionality */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

      {/* Colorful Watercolor Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#ff9999' }} /> {/* Pink */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-25 animate-float-2 pointer-events-none" style={{ backgroundColor: '#aaff99' }} /> {/* Green */}
      <div className="absolute top-[20%] left-[10%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[90px] opacity-20 animate-float-3 pointer-events-none" style={{ backgroundColor: '#ffcc99' }} /> {/* Orange */}
      <div className="absolute bottom-[20%] right-[10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-20 animate-float-4 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}

      <div className="relative z-10">
        <NavBar />
        {selectionMode && (
        <div className="fixed  inset-x-4 z-[100] bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-orange-900/10 rounded-2xl p-2 animate-in slide-in-from-bottom-6 fade-in duration-300">
          <SelectionBar
            count={selectedIds.size}
            onClear={handleClear}
            onDelete={() => setConfirmDelete(true)}
            onDownload={handleBulkDownload}
          />
        </div>
      )}
        <div className="max-w-7xl mx-auto py-12 px-6 space-y-12 pb-24">
          
          {/* HERO SECTION */}
          <div className="space-y-8">
            {/* Welcome Card */}
            <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white overflow-hidden group">
               {/* Subtle Gradient Overlay */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff9999] via-[#ffcc99] to-[#aaff99]"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff9999] to-[#ff6666]">{user.username}</span>
                  </h1>
                  <div className="flex items-center gap-2 opacity-60">
                    <div className="w-2 h-2 rounded-full bg-[#aaff99]"></div>
                    <p className="font-bold text-xs tracking-widest uppercase text-slate-500">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "All Photos", sub: "Browse gallery", path: "/photos", color: "#ff9999", border: "hover:border-[#ff9999]" },
                { label: "Events", sub: "Active events", path: "/events", color: "#aaff99", border: "hover:border-[#aaff99]" },
                { label: "My Activity", sub: "Likes & comments", path: "/Activity", color: "#99c0ff", border: "hover:border-[#99c0ff]" },
              ].map((action, i) => (
                <button 
                  key={i}
                  onClick={() => navigate(action.path)} 
                  className={`group bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1 ${action.border}`}
                >
                  <div className="font-black text-slate-800 text-xl tracking-tight mb-1">{action.label}</div>
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full" style={{ backgroundColor: action.color }}></span>
                     <div className="text-slate-400 text-xs font-bold uppercase tracking-wide group-hover:text-slate-600 transition-colors">{action.sub}</div>
                  </div>
                </button>
              ))}

              {(
                <button 
                  onClick={() => navigate("/EventsCreate")} 
                  className="group relative bg-gradient-to-br from-[#ffcc99] to-[#ff9999] rounded-[2rem] p-6 text-left transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-1 overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="font-black text-white text-xl tracking-tight mb-1">Create</div>
                    <div className="text-white/80 text-xs font-bold uppercase tracking-wide group-hover:text-white transition-colors">New event</div>
                  </div>
                  {/* Decorative circle */}
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                </button>
              )}
            </div>
          </div>

          {/* TRENDING PHOTOS */}
          {trendingPhotos.length > 0 && (
            <section className="animate-in fade-in duration-500">
              <div className="flex items-end justify-between mb-8 px-2">
                <div>
                  <span className="text-[#ff9999] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-10 h-[2px] bg-[#ff9999]"></span> Trending
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Popular Pics</h2>
                </div>
                <button onClick={() => navigate("/photos")} className="px-6 py-3 bg-white border border-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                  View all
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {trendingPhotos.map((photo) => (
                  <div key={photo.photoid} className="transition-transform duration-300 hover:scale-[1.03]">
                    <PhotoCard
                      photo={photo}
                      selected={selectedIds.has(photo.photoid)}
                      selectionMode={selectionMode}
                      onToggleSelect={toggleSelect}
                      onClick={() => !selectionMode && setSelectedPhoto(photo)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* RECENT ACTIVITY BENTO BOX */}
          <section className="bg-white/50 backdrop-blur-2xl rounded-[3rem] p-8 border border-white shadow-sm">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-1.5 bg-[#99c0ff] rounded-full"></div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">My Activity</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* My Likes */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <span className="text-[#ff6666]">♥</span> Recent Likes
                </h3>
                {myLikes.length === 0 && <p className="text-sm text-slate-400 font-medium bg-white/50 p-4 rounded-2xl border border-dashed border-slate-200">No liked assets yet.</p>}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {myLikes.map((like: any) => (
                    <div key={like.photoId} className="rounded-2xl overflow-hidden shadow-sm bg-white p-1.5 border border-slate-100 hover:rotate-2 transition-transform">
                       <LikesCard
                        photo={{
                          photoid: like.photo.photoid,
                          photoFile: like.photo.photoFile,
                          likecount: like.photo.likecount || 0,
                        }}
                        isLikedByCurrentUser={true}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* My Comments */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <span className="text-[#99c0ff]">💬</span> Recent Comments
                </h3>
                <div className="space-y-4">
                  {myComments.length === 0 && <p className="text-sm text-slate-400 font-medium bg-white/50 p-4 rounded-2xl border border-dashed border-slate-200">No comments recorded.</p>}
                  {myComments.map((comment: any) => (
                    <div key={comment.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:border-[#99c0ff] transition-colors group">
                      <CommentsCard
                        comment={comment}
                        onDelete={(id) => setMyComments(prev => prev.filter(c => c.id !== id))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* RECENTLY ADDED */}
          <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
               <span className="text-[#aaff99] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-10 h-[2px] bg-[#aaff99]"></span> Fresh
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Recently Added</h2>
            </div>
          </div>

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide px-2 h-80 scroll-smooth"
          >
            {recentPhotos.map((photo) => (
              <div
                key={photo.photoid}
                className="min-w-[240px] flex-shrink-0 group"
              >
                <div className="group-hover:-translate-y-2 transition-transform duration-300">
                  <PhotoCard
                    photo={photo}
                    selected={selectedIds.has(photo.photoid)}
                    selectionMode={selectionMode}
                    onToggleSelect={toggleSelect}
                    onClick={() => !selectionMode && setSelectedPhoto(photo)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            ref={recentSentinelRef}
            className="h-20 flex flex-col items-center justify-center"
          >
            {loadingMore && (
              <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ffcc99] rounded-full animate-spin"></div>
            )}
            {!recentNextUrl && recentPhotos.length > 0 && (
              <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">
                • End of Archive •
              </div>
            )}
          </div>
        </section>

          {/* SELECTION BAR */}
          {selectionMode && (
            <div className="sticky bottom-6 z-50">
               <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200 rounded-full mx-auto max-w-2xl p-2">
                <SelectionBar
                  count={selectedIds.size}
                  onClear={handleClear}
                  onDelete={() => setConfirmDelete(true)}
                  onDownload={handleBulkDownload}
                />
              </div>
            </div>
          )}
        </div>

        {/* MODALS & OVERLAYS */}
        {selectedPhoto && !selectionMode && (
          <div className="fixed inset-0 z-[100]   animate-in fade-in">
             <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
          </div>
        )}

        {/* DELETE CONFIRM - Red Theme */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl shadow-red-900/5" onClick={(e) => e.stopPropagation()}>
               <div className="w-14 h-14 bg-[#fff0f0] rounded-full flex items-center justify-center text-[#ff3333] mb-6 mx-auto">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Confirm Deletion</h3>
              <p className="text-center text-slate-500 font-medium mb-8 leading-relaxed">
                This action is permanent. <span className="text-[#ff3333] font-bold">{selectedIds.size} item(s)</span> will be removed.
              </p>
              <div className="flex gap-4">
                <button
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-colors"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-4 bg-[#ff3333] text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-[#cc0000] shadow-lg shadow-red-200 transition-colors"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Purging..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed bottom-10 right-10 bg-[#fff0f0] border-l-4 border-[#ff3333] text-[#cc0000] px-6 py-4 rounded-r-xl shadow-xl z-50 font-bold text-sm flex items-center gap-3">
             <span>⚠️</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
