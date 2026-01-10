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
          limit: 5,
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
          if (data.likedBy == user.username) return;
          toast.success(`${data.likedBy  } liked your photo`);
          
        
  
          
        });
  
        return () => {
          unsubscribe();
        };
      } , [user?.userid]); // Only resubscribe if userId changes
  
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

if (loading)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fefae0]/40">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#bc6c25] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-[#606c38]">
          Loading Dashboard
        </p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
  /* Using a 30% opacity of your theme yellow for a "cream" paper feel */
  <div className="min-h-screen bg-[#fefae0]/30 font-sans text-[#283618]">
    <NavBar />

    <div className="mx-auto py-11.5 px-25 space-y-12 pb-15">
      
      {/* HERO + QUICK ACTIONS */}
      <div className="space-y-6">
        <div className="relative bg-[#283618] text-[#fefae0] rounded-xl p-7.5 overflow-hidden shadow-xl border border-[#606c38]">
          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tighter uppercase">Welcome back, {user.username}</h1>
            <div className="flex items-center gap-2 mt-2 opacity-80">
              <div className="w-1.5 h-1.5 bg-[#dda15e]"></div>
              <p className="font-bold text-xs tracking-widest uppercase">{user.email}</p>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {[
            { label: "All Photos", sub: "Browse gallery", path: "/photos" },
            { label: "Events", sub: "Active events", path: "/events" },
            { label: "My Activity", sub: "Likes & comments", path: "/Activity" },
          ].map((action, i) => (
            <button 
              key={i}
              onClick={() => navigate(action.path)} 
              /* White cards on the light cream background create a clean depth effect */
              className="group bg-white border border-[#dda15e]/20 rounded-xl p-4.5 text-left transition-all hover:border-[#bc6c25] hover:shadow-md"
            >
              <div className="font-black text-[#283618] text-lg uppercase tracking-tight">{action.label}</div>
              <div className="text-[#606c38] text-xs font-bold uppercase tracking-wide group-hover:translate-x-1 transition-transform">{action.sub}</div>
            </button>
          ))}

          {(
            <button 
              onClick={() => navigate("/EventsCreate")} 
              className="group bg-[#bc6c25] rounded-xl p-4.5 text-left transition-all shadow-lg hover:bg-[#283618]"
            >
              <div className="font-black text-[#fefae0] text-lg uppercase tracking-tight">Create</div>
              <div className="text-[#fefae0]/80 text-xs font-bold uppercase tracking-wide group-hover:translate-x-1 transition-transform">New event</div>
            </button>
          )}
        </div>
      </div>

      {/* TRENDING PHOTOS */}
      {trendingPhotos.length > 0 && (
        <section className="animate-in fade-in duration-500">
          <div className="flex items-end justify-between mb-6 px-1">
            <div>
              <span className="text-[#bc6c25] font-black text-[10px] uppercase tracking-[0.3em]">Trending</span>
              <h2 className="text-2xl font-black text-[#283618] tracking-tighter uppercase">Popular Pics</h2>
            </div>
            <button onClick={() => navigate("/photos")} className="px-5 py-2 bg-white border border-[#dda15e]/30 text-[#283618] rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#fefae0] transition-all">
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4.5">
            {trendingPhotos.map((photo) => (
              <div key={photo.photoid} className="transition-transform duration-300">
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
      {/* Lightest green tint (#606c38 at 5%) for the container to separate it from the cream background */}
      <section className="bg-[#606c38]/5 rounded-2xl p-7.5 border border-[#606c38]/10">
        <div className="flex items-center gap-3 mb-8">
            <div className="h-6 w-1 bg-[#bc6c25]"></div>
            <h2 className="text-2xl font-black text-[#283618] tracking-tighter uppercase">My Activity</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-9">
          {/* My Likes */}
          <div>
            <h3 className="text-xs font-black text-[#606c38] uppercase tracking-widest mb-4">Recent Likes</h3>
            {myLikes.length === 0 && <p className="text-xs text-gray-400 italic font-medium tracking-wide">No liked assets yet.</p>}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {myLikes.map((like: any) => (
                <div key={like.photoId} className="rounded-lg overflow-hidden shadow-sm bg-white p-1">
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
            <h3 className="text-xs font-black text-[#606c38] uppercase tracking-widest mb-4">Recent Comments</h3>
            <div className="space-y-3">
              {myComments.length === 0 && <p className="text-xs text-gray-400 italic font-medium tracking-wide">No comments recorded.</p>}
              {myComments.map((comment: any) => (
                <div key={comment.id} className="bg-white p-4 rounded-lg shadow-sm border border-[#dda15e]/20 hover:border-[#bc6c25] transition-colors">
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
        <div className="flex items-center justify-between mb-6 px-1">
           <h2 className="text-2xl font-black text-[#283618] tracking-tighter uppercase">Recently Added</h2>
        </div>
        <div className="flex gap-4.5 overflow-x-auto pb-6 scrollbar-hide px-1 h-72">
          {recentPhotos.map((photo) => (
            <div key={photo.photoid} className="min-w-[200px] flex-shrink-0 group">
              <div className="group-hover:-translate-y-1 transition-transform duration-300">
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
        
        <div ref={recentSentinelRef} className="h-15 flex flex-col items-center justify-center">
          {loadingMore && <div className="w-6 h-6 border-2 border-[#bc6c25] border-t-transparent rounded-full animate-spin"></div>}
          {!recentNextUrl && recentPhotos.length > 0 && (
            <div className="text-[#606c38]/40 text-[10px] font-black uppercase tracking-[0.4em]">
              Archive Complete 
            </div>
          )}
        </div>
      </section>

      {/* SELECTION BAR */}
      {selectionMode && (
        <SelectionBar
          count={selectedIds.size}
          onClear={handleClear}
          onDelete={() => setConfirmDelete(true)}
        />
      )}
    </div>

    {/* MODALS & OVERLAYS */}
    {selectedPhoto && !selectionMode && (
      <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
    )}

    {/* DELETE CONFIRM */}
    {confirmDelete && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#283618]/90 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-black text-[#283618] text-center mb-2 uppercase">Confirm Deletion</h3>
          <p className="text-center text-gray-500 text-sm mb-6 leading-relaxed">
            This action is permanent. <span className="font-bold text-red-600">{selectedIds.size} asset(s)</span> will be purged from the archive.
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="w-full py-3 bg-red-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-colors"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Purging..." : "Confirm Purge"}
            </button>
            <button
              className="w-full py-3 bg-[#fefae0] text-[#283618] rounded-lg font-black uppercase tracking-widest text-xs hover:bg-[#dda15e]/30 transition-colors"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {error && (
      <div className="fixed bottom-10 right-10 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 font-black uppercase text-xs tracking-widest">
        {error}
      </div>
    )}
  </div>
);
}

export default HomePage;
