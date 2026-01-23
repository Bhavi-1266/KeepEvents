import { useEffect, useState, useRef } from "react";
import { getMe } from "../services/auth.ts";
import { toast } from "react-hot-toast";
import { getMyClicksStats } from "../services/user.ts";
import type { UserActivitySummary } from "../types/user.ts";
import { GetMyClicks, getNextSetPhotos, DeletePhotos } from "../services/Photos.ts";
import { useWebSocket } from "../contexts/WebSocketContext.tsx";
import NavBar from "../components/navBar.tsx";
import SelectionBar from "../components/selectionBar.tsx";
import HighlightPhoto from "../components/HighlightPhoto.tsx";
import { useNavigate } from "react-router-dom";
import PhotoCard from "../components/PhotoCard.tsx";
import type { User } from "../types/user.ts";
import type { Photo } from "../types/photos.ts";
import JSZip from "jszip";
import { Search, Calendar } from "lucide-react";

function MyActivityPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();
    const { subscribe } = useWebSocket();
  const [myClicks, setMyClicks] = useState<Photo[]>([]);
  const [selectedClick, setSelectedClick] = useState<Photo | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [Sort, setSort] = useState("-uploadDate");
  const [FindMe, setFindMe] = useState(false);
  const [startingDate, setStartingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [fetchingMore, setFetchingMore] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [summary, setSummary] = useState<UserActivitySummary | null>(null);

  /* ---------------- INIT AUTH & PHOTOS ---------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const data = await getMe();
        setCurrentUser(data.user);

        const photosData = await GetMyClicks(data.user.userid, {
          offset: 0,
          ordering: Sort,
        });
        setMyClicks(photosData.results);
        setNextUrl(photosData.next);

        const summaryData = await getMyClicksStats();
        setSummary(summaryData);
      } catch (err: any) {
        setError(err.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  /* ---------------- LAZY LOADING ---------------- */
  const LazyLoading = async () => {
    if (fetchingMore || !nextUrl) {
      return;
    }
    setFetchingMore(true);
    try {
      const data = await getNextSetPhotos(nextUrl);
      setMyClicks((prev) => [...prev, ...data.results]);
      setNextUrl(data.next);
      setError(null);
    } catch (err: any) {
      console.error("Error loading more photos:", err);
      setError(err.message || "Failed to load more photos");
    } finally {
      setFetchingMore(false);
    }
  };

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          LazyLoading();
        }
      },
      {
        threshold: 0.1,
        root: null,
        rootMargin: "200px",
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [nextUrl, fetchingMore]);

  /* ---------------- SOCKET CONNECTION ---------------- */
  
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribe("photo_liked", (data) => {
      if (data.userid !== currentUser.userid) return;
      toast.success(`${data.likedBy} liked your photo`);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.userid]);

   useEffect(() => {
        if (!currentUser) return;
  
        const unsubscribe = subscribe("comment_added", (data) => {
          if (data.userid !== currentUser.userid) return;
          if (data.commentedBy == currentUser.username) return;
          toast.success(`${data.commentedBy  } commented ${data.comment}`);
        });
  
        return () => {  
          unsubscribe();
        };
      } , [currentUser?.userid]); // Only resubscribe if userId changes

      const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;

    const zip = new JSZip();
    
    // Get the actual photo objects based on selected IDs
    const photosToDownload = myClicks.filter((p) => selectedIds.has(p.photoid));
    
    

    // Create download promises
    const downloadPromises = photosToDownload.map(async (photo) => {
      try {
        // Ensure this matches your API property (photo.photoFile based on your snippet)
        const imageUrl = photo.photoFile; 
        
        if (!imageUrl) return;

        // Fetch the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Determine extension (jpg/png)
        const ext = blob.type.split('/')[1] || 'jpg';
        const filename = `photo-${photo.photoid}.${ext}`;

        // Add to the zip file
        zip.file(filename, blob);
      } catch (err) {
        console.error(`Failed to load photo ${photo.photoid}`, err);
      }
    });

    // Wait for all photos to be fetched and added to zip
    await Promise.all(downloadPromises);

    try {
      // Generate the single ZIP file
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = window.URL.createObjectURL(content);

      // Trigger ONE download action
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `Event-Photos-${new Date().toISOString().slice(0, 10)}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(zipUrl);
      toast.success("Download started!");
      
      handleClear(); // Clear selection when done
    } catch (err) {
      console.error("Failed to zip files", err);
      toast.error("Failed to generate zip file");
    }
  };

  /* ---------------- APPLY FILTERS ---------------- */
  useEffect(() => {
    applyFilters();
  }, [Sort, FindMe]);

  const applyFilters = async () => {
    if (!currentUser) return;

    setLoadingPhotos(true);
    try {
      const data = await GetMyClicks(currentUser.userid, {
        offset: 0,
        limit: 20,
        ordering: Sort,
        filters: {
          search: searchQuery,
          date_after: startingDate,
          date_before: endingDate,
          FindMe: FindMe ? "true" : "false",
        },
      });

      setMyClicks(data.results);
      setNextUrl(data.next);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load photos");
    } finally {
      setLoadingPhotos(false);
    }
  };

  const reset = async () => {
    if (!currentUser) return;

    setLoadingPhotos(true);
    try {
      setSearchQuery("");
      setSort("-uploadDate");
      setFindMe(false);
      setStartingDate("");
      setEndingDate("");
      setShowDateFilters(false);

      const data = await GetMyClicks(currentUser.userid, {
        offset: 0,
        ordering: "-uploadDate",
      });
      setMyClicks(data.results);
      setNextUrl(data.next);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load photos");
    } finally {
      setLoadingPhotos(false);
    }
  };

  /* ---------------- SELECTION & DELETE ---------------- */
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      const res = await DeletePhotos([...selectedIds]);

      const deletedCount = res.deleted?.length ?? 0;
      const skippedCount = res.skipped_no_permission?.length ?? 0;

      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} photo${deletedCount > 1 ? "s" : ""}`);
      }

      if (skippedCount > 0) {
        toast(`Skipped ${skippedCount} photo${skippedCount > 1 ? "s" : ""} (no permission)`, {
          icon: "⚠️",
          style: {
            background: "#fff7ed",
            color: "#92400e",
          },
        });
      }

      if (deletedCount === 0 && skippedCount > 0) {
        toast("No photos were deleted", { icon: "ℹ️" });
      }

      setMyClicks((prev) => prev.filter((photo) => !res.deleted.includes(photo.photoid)));

      handleClear();
    } catch (err) {
      toast.error("Failed to delete selected photos");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

 // 1. Loading State (Pink Theme)
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ff9999] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Gallery...</p>
        </div>
      </div>
    );
  }

  // 2. Auth Check
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 shadow-xl">
           <p className="text-[#ff3333] font-black text-xl tracking-tight">Please log in to view your gallery.</p>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard
  return (
    <div className="relative min-h-screen w-full bg-white font-sans overflow-hidden">
      
      {/* --- Background Aesthetics --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(50px, -50px) scale(1.1) rotate(5deg); }
          66% { transform: translate(-30px, 40px) scale(0.9) rotate(-5deg); }
        }
        /* Added more animation timings for variation */
        .animate-float-1 { animation: float 20s infinite ease-in-out; }
        .animate-float-2 { animation: float 25s infinite ease-in-out -5s; }
        .animate-float-3 { animation: float 28s infinite ease-in-out -10s; }
        .animate-float-4 { animation: float 32s infinite ease-in-out -15s; }
        .animate-float-5 { animation: float 22s infinite ease-in-out -2s; }
        .animate-float-6 { animation: float 35s infinite ease-in-out -8s; }

        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>
      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />
      
      {/* === ENHANCED COLORFUL BLOBS === */}
      {/* These are layered with mix-blend-multiply for a watercolor effect */}
      
      {/* Top Right - Large Pink */}
      <div className="absolute top-[-15%] right-[-15%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-25 animate-float-1 pointer-events-none" style={{ backgroundColor: '#ff9999' }} />
      
      {/* Bottom Left - Large Green */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-25 animate-float-2 pointer-events-none" style={{ backgroundColor: '#aaff99' }} />
      
      {/* Center Left - Medium Orange */}
      <div className="absolute top-[30%] left-[-5%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-3 pointer-events-none" style={{ backgroundColor: '#ffcc99' }} />
      
      {/* Top Left - Large Baby Blue (Added for balance) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-20 animate-float-4 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} />
      
      {/* Bottom Right - Medium Deep Pink Accent */}
      <div className="absolute bottom-[10%] right-[-5%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[90px] opacity-15 animate-float-5 pointer-events-none" style={{ backgroundColor: '#ff6666' }} />

      {/* Center Right - Small bright green accent */}
      <div className="absolute top-[40%] right-[5%] w-[25rem] h-[25rem] rounded-full mix-blend-multiply filter blur-[80px] opacity-15 animate-float-6 pointer-events-none" style={{ backgroundColor: '#80ff66' }} />


      <div className="relative z-10">
        <NavBar />

        {/* ERROR ALERT */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 mt-6">
            <div className="bg-[#fff0f0] border-l-4 border-[#ff3333] text-[#cc0000] px-6 py-4 rounded-r-xl font-bold shadow-sm flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          </div>
        )}

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

        {summary && (
          <div className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
            
            {/* PROFILE HEADER CARD */}
            <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Profile Icon - Orange Theme */}
                <div className="w-20 h-20 bg-gradient-to-br from-[#ffcc99] to-[#ffb366] rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-200 rotate-3">
                  {summary.user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{summary.user.username}</h2>
                  <p className="text-slate-500 font-medium tracking-wide">{summary.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl text-slate-500 border border-slate-100">
                <span className="text-xs font-black uppercase tracking-widest">
                  Member since: {summary.stats.first_upload_date ? new Date(summary.stats.first_upload_date).getFullYear() : "—"}
                </span>
              </div>
            </div>

            {/* STATS COUNTERS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Photos", value: summary.stats.total_photos, color: "#ff9999" }, // Pink
                { label: "Likes", value: summary.stats.total_likes, color: "#ff3333" }, // Red
                { label: "Views", value: summary.stats.total_views, color: "#ffcc99" }, // Orange
                { label: "Downloads", value: summary.stats.total_downloads, color: "#aaff99" }, // Green
                { label: "Comments", value: summary.stats.total_comments, color: "#99f7ff" }, // Aqua
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/60 backdrop-blur-2xl p-6 rounded-[2rem] shadow-sm border border-white hover:scale-105 transition-transform duration-300"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: stat.color }}>
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-slate-800">{stat.value ?? 0}</p>
                </div>
              ))}
            </div>

            {/* INSIGHTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Top Tags - PINK Theme */}
              <div className="bg-white/50 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                  <span className="w-3 h-3 bg-[#ff9999] rounded-full shadow-[0_0_10px_#ff9999]"></span> Top Tags
                </h3>
                <div className="space-y-3">
                  {summary.activity.top_tags.map((t) => (
                    <div key={t.tag} className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl border border-slate-50">
                      <span className="text-sm font-bold text-slate-600">#{t.tag}</span>
                      <span className="text-[10px] bg-[#fff0f0] text-[#ff6666] px-3 py-1 rounded-full font-black">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Locations - GREEN Theme */}
              <div className="bg-white/50 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                  <span className="w-3 h-3 bg-[#aaff99] rounded-full shadow-[0_0_10px_#aaff99]"></span> Locations
                </h3>
                <div className="space-y-3">
                  {summary.activity.top_locations.map((l) => (
                    <div key={l.location} className="flex justify-between items-center bg-white px-5 py-3 rounded-2xl border border-slate-50">
                      <span className="text-sm font-bold text-slate-600 line-clamp-1">{l.location}</span>
                      <span className="text-[10px] bg-[#f0fdf4] text-[#4ade80] px-3 py-1 rounded-full font-black">{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Major Events - ORANGE Theme */}
              <div className="bg-white/50 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg">
                  <span className="w-3 h-3 bg-[#ffcc99] rounded-full shadow-[0_0_10px_#ffcc99]"></span> Major Events
                </h3>
                <div className="space-y-3">
                  {summary.activity.major_events.map((e) => (
                    <div key={e.event__eventid} className="p-4 bg-[#fffaf0] rounded-2xl border border-orange-50">
                      <p className="text-sm font-black text-orange-900 mb-1">{e.event__eventname}</p>
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{e.photo_count} photos</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selection Bar Sticky */}
        

        {/* --- FILTERS & SEARCH DASHBOARD --- */}
        <div className="max-w-7xl mx-auto px-6 my-10">
          <div className="bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8">
            
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {/* Search Bar with ORANGE Focus */}
              <div className="flex-1 min-w-[300px] relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-[#ffb366] transition-colors" />
                <input
                  type="text"
                  placeholder="Search your memories..."
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium text-slate-700"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffb366'; // Orange Border
                    e.target.style.boxShadow = '0 0 0 4px rgba(255, 179, 102, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#f1f5f9';
                    e.target.style.boxShadow = 'none';
                  }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>

              {/* Find Me Toggle - PINK */}
              <button
                onClick={() => setFindMe(!FindMe)}
                className={`px-8 py-4 rounded-2xl font-black transition-all active:scale-95 ${
                  FindMe
                    ? "bg-[#ff9999] text-white shadow-lg shadow-pink-200"
                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                }`}
              >
                Find Me
              </button>

              {/* Date Filter Toggle - GREEN */}
              <button
                onClick={() => setShowDateFilters(!showDateFilters)}
                className={`px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 ${
                  showDateFilters || startingDate || endingDate
                    ? "bg-[#aaff99] text-[#1a4d1a] shadow-lg shadow-green-100"
                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                }`}
              >
                <Calendar size={18} />
                Date Range
              </button>
            </div>

            {/* Date Range Filters (Collapsible) */}
            {showDateFilters && (
              <div className="flex gap-6 items-end pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                  <input
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#aaff99]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                  <input
                    type="date"
                    value={endingDate}
                    min={startingDate}
                    onChange={(e) => setEndingDate(e.target.value)}
                    className="p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#aaff99]"
                  />
                </div>

                {(startingDate || endingDate) && (
                  <button
                    onClick={() => {
                      setStartingDate("");
                      setEndingDate("");
                    }}
                    className="px-4 py-3 text-[#ff3333] hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest mb-[1px]"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}

            {/* Sort & Action Buttons Row */}
            <div className="flex items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sort by:</label>
                <select
                  value={Sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-[#ffb366] transition-colors"
                >
                  <option value="-uploadDate">Newest First</option>
                  <option value="uploadDate">Oldest First</option>
                  <option value="-likecount">Most Liked</option>
                  <option value="-viewcount">Most Viewed</option>
                  <option value="-commentcount">Most Commented</option>
                  <option value="-FaceCount">Most People</option>
                </select>
              </div>

              <div className="flex gap-3">
                {/* Apply Button - VIBRANT ORANGE */}
                <button
                  onClick={applyFilters}
                  disabled={selectionMode || loadingPhotos}
                  className={`px-8 py-3 font-bold rounded-2xl transition-all shadow-lg ${
                    selectionMode || loadingPhotos
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-[#ffb366] hover:bg-[#ffaa4d] text-white shadow-orange-200 hover:-translate-y-0.5"
                  }`}
                >
                  {loadingPhotos ? "Applying..." : "Apply Filters"}
                </button>

                {(searchQuery || FindMe || startingDate || endingDate || Sort !== "-uploadDate") && (
                  <button
                    onClick={reset}
                    disabled={selectionMode || loadingPhotos}
                    className={`px-6 py-3 font-bold rounded-2xl transition-all ${
                      selectionMode || loadingPhotos
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-400 hover:text-[#ff3333] hover:bg-red-50"
                    }`}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PHOTO GRID SECTION */}
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Your Gallery</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-[#ff9999] to-[#aaff99] rounded-full mt-2"></div>
          </div>

          {loadingPhotos ? (
            <div className="text-center py-24">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ffb366] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Loading memories...</p>
            </div>
          ) : myClicks.length === 0 ? (
            <div className="text-center py-24 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="text-6xl mb-6">📸</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No photos found</h3>
              <p className="text-slate-500 font-medium">Try adjusting your filters to see more moments.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {myClicks.map((photo) => (
                  <div key={photo.photoid} className="group transition-transform hover:scale-[1.02] active:scale-95 duration-300">
                    <PhotoCard
                      photo={photo}
                      selected={selectedIds.has(photo.photoid)}
                      selectionMode={selectionMode}
                      onToggleSelect={toggleSelect}
                      onClick={() => !selectionMode && setSelectedClick(photo)}
                    />
                  </div>
                ))}
              </div>

              {/* INFINITE SCROLL SENTINEL */}
              <div ref={sentinelRef} className="h-32 flex items-center justify-center mt-8">
                {fetchingMore ? (
                  <div className="flex flex-col items-center gap-3">
                     <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ff9999] rounded-full animate-spin" />
                  </div>
                ) : !nextUrl && myClicks.length > 0 ? (
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">End of Gallery</span>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* HIGHLIGHT MODAL */}
        {selectedClick && !selectionMode && (
          <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-3xl animate-in fade-in duration-300">
             <HighlightPhoto photo={selectedClick} onClick={() => setSelectedClick(null)} />
          </div>
        )}

        {/* Delete Confirmation Modal - RED Theme */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl shadow-red-900/10">
              <div className="w-14 h-14 bg-[#fff0f0] rounded-full flex items-center justify-center text-[#ff3333] mb-6 mx-auto">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>

              <h3 className="text-2xl font-black text-center text-slate-900 mb-2">
                Delete {selectedIds.size} photo{selectedIds.size !== 1 ? "s" : ""}?
              </h3>
              <p className="text-slate-500 text-center font-medium mb-8">
                This action is permanent and cannot be undone.
              </p>

              <div className="flex gap-4">
                <button
                  className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors uppercase text-xs tracking-widest"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-6 py-4 bg-[#ff3333] text-white font-bold rounded-2xl hover:bg-[#cc0000] transition-colors shadow-lg shadow-red-200 disabled:opacity-50 uppercase text-xs tracking-widest"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyActivityPage;