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
import { connectSocket, disconnectSocket, subscribe } from "../services/socket";
import type { User } from "../types/user";
import type { Photo , Like , Comment } from "../types/photos";
import type { Event } from "../types/event";

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
            filters: { user: me.user.id } 
        });
        setMyLikes(myLikesData.results?.slice(0, 4) || []);

        // ✅ FIXED: My Comments (user-filtered)
        const myCommentsData = await getComments({ 
          photoId: 0, // Dummy - gets ALL comments
          filters: { userid: me.user.id }, // Your user filter
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


  useEffect(() => {
        if (!user) return;
  
        connectSocket(user.userid);
  
        // Cleanup on unmount only
        return () => {
          disconnectSocket();
        };
      }, [user]); // Only reconnect if userId changes
  
      
  
      // ✅ Subscribe to photo likes
      useEffect(() => {
        if (!user) return;
  
        const unsubscribe = subscribe("photo_liked", (data) => {
          if (data.userid !== user.userid) return;
          // if (data.likedBy == user.username) return;
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-7xl mx-auto py-6 px-6 space-y-12 pb-16">
        {/* HERO + QUICK ACTIONS */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-8">
            <h1 className="text-3xl font-bold">Welcome back, {user.username}</h1>
            <p className="opacity-90 mt-1">{user.email}</p>
          </div>

          {/* QUICK ACTIONS - Inline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => navigate("/photos")} className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all shadow-lg border border-white/20">
              <div className="text-2xl mb-2">📸</div>
              <div className="font-semibold">All Photos</div>
              <div className="text-sm opacity-90 group-hover:translate-x-1 transition-transform">Browse gallery</div>
            </button>
            <button onClick={() => navigate("/events")} className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all shadow-lg border border-white/20">
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold">Events</div>
              <div className="text-sm opacity-90 group-hover:translate-x-1 transition-transform">Active events</div>
            </button>
            <button onClick={() => navigate("/Activity")} className="group bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all shadow-lg border border-white/20">
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">My Activity</div>
              <div className="text-sm opacity-90 group-hover:translate-x-1 transition-transform">Likes & comments</div>
            </button>
            {userRole === 1 && (
              <button onClick={() => navigate("/EventsCreate")} className="group bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all shadow-lg border border-emerald-400/30">
                <div className="text-2xl mb-2">➕</div>
                <div className="font-semibold text-emerald-100">Create</div>
                <div className="text-sm opacity-90 group-hover:translate-x-1 transition-transform">New event</div>
              </button>
            )}
          </div>
        </div>

        {/* TRENDING PHOTOS - Inline Grid */}
        {trendingPhotos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🔥 Trending Photos
              </h2>
              <button onClick={() => navigate("/photos")} className="text-blue-600 hover:underline font-medium">
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {trendingPhotos.map((photo) => (
                <div key={photo.photoid} className="group">
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

        {/* FAVORITE EVENTS - Inline */}
        {favoriteEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                ⭐ Favorite Events
              </h2>
              <button onClick={() => navigate("/events")} className="text-blue-600 hover:underline font-medium">
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoriteEvents.map((event) => (
                <EventCard
                  key={event.eventid}
                  event={event}
                  onClick={() => navigate(`/events/${event.eventid}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* MY ACTIVITY - Inline Grid */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">⚡ My Activity</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Likes */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">❤️ Recent Likes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {myLikes.map((like: any) => (
                  <LikesCard
                    key={like.photoId}
                    photo={{
                      photoid: like.photo.photoid,
                      photoFile: like.photo.photoFile,
                      likecount: like.photo.likecount || 0,
                    }
                    }
                    isLikedByCurrentUser={true}
                  />
                ))}
              </div>
            </div>

            {/* My Comments - Mock data, replace with API */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">💬 Recent Comments</h3>
              <div className="space-y-3">
                {myComments.map((comment: any) => (
                  <CommentsCard
                    key={comment.id}
                    comment={{
                      id: comment.id,
                      commentText: comment.commentText,
                      commentedAt: comment.commentedAt,
                      photo: {
                        photoid: comment.photo?.photoid || 0,
                        photoFile: comment.photo?.photoFile || '',
                        title: comment.photo?.title
                      }
                    }}
                    onDelete={(commentId) => {
                      setMyComments(prev => prev.filter(c => c.id !== commentId));
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RECENT PHOTOS - Inline Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              🕒 Recently Added
            </h2>
            <button onClick={() => navigate("/photos")} className="text-blue-600 hover:underline font-medium">
              View all →
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {recentPhotos.map((photo) => (
              <div key={photo.photoid} className="min-w-[200px] flex-shrink-0 hover:scale-105 transition-transform">
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
          <div ref={recentSentinelRef} className="h-12 flex items-center justify-center mt-4 text-sm text-gray-500">
            {loadingMore && "Loading more…"}
            {!recentNextUrl && recentPhotos.length > 0 && "All caught up!"}
          </div>
        </section>

        {/* ACTIVE EVENTS - Compact Grid */}
        {events.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🎯 Active Events
              </h2>
              <button onClick={() => navigate("/events")} className="text-blue-600 hover:underline font-medium">
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {events.slice(0, 12).map((event) => (
                <EventCard
                  key={event.eventid}
                  event={event}
                  onClick={() => navigate(`/events/${event.eventid}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* SELECTION BAR */}
        {selectionMode && (
          <SelectionBar
            count={selectedIds.size}
            onClear={handleClear}
            onDelete={() => setConfirmDelete(true)}
          />
        )}
      </div>

      {/* MODALS */}
      {selectedPhoto && !selectionMode && (
        <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete photos?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action is <strong>permanent</strong>. {selectedIds.size} photo(s) will be deleted.
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

      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
}

export default HomePage;
