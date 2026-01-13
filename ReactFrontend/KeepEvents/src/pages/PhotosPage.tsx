import { getAllPhotos, getSearchedFilteredSortedPhotos, getNextSetPhotos, DeletePhotos } from "../services/Photos";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useEffect, useState, useRef } from "react";
import type { Photo } from "../types/photos";
import PhotoCard from "../components/PhotoCard";
import HighlightPhoto from "../components/HighlightPhoto";
import SelectionBar from "../components/selectionBar";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { User } from "../types/user";
import { getMe } from "../services/auth";
import JSZip from "jszip";
import NavBar from "../components/navBar";
import { Search, Calendar } from "lucide-react";

function PhotosGallery() {
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const { subscribe } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [Sort, setSort] = useState("-uploadDate");
  const [FindMe, setFindMe] = useState(false);
  const [startingDate, setStartingDate] = useState("");
  const [endingDate, setEndingDate] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [fetchingMore, setFetchingMore] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [UserRole, setUserRole] = useState<number>(3);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me.user);
        setUserRole(me.user.groups[0]);
        const data = await getAllPhotos({ offset: 0, ordering: Sort });
        setPhotos(data.results);
        setNextUrl(data.next);
      } catch (err: any) {
        setError(err.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [nextUrl, fetchingMore]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribe("photo_liked", (data) => {
      if (data.userid !== currentUser.userid) return;
      if (data.likedById == currentUser.userid) return;
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
    const photosToDownload = photos.filter((p) => selectedIds.has(p.photoid));
    
    

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
  };  // Apply filters when Sort or FindMe changes
  useEffect(() => {
    applyFilters();
  }, [Sort, FindMe]);

  /* ---------------- LOAD MORE ---------------- */
  const loadMore = async () => {
    if (fetchingMore || !nextUrl) {
      return;
    }
    setFetchingMore(true);
    try {
      const data = await getNextSetPhotos(nextUrl);
      setPhotos((prev) => [...prev, ...data.results]);
      setNextUrl(data.next);
    } catch (err: any) {
      setError(err.message || "Failed to load more photos");
    } finally {
      setFetchingMore(false);
    }
  };

  /* ------------- APPLY FILTERS ------------- */
  const applyFilters = async () => {
    setLoadingPhotos(true);
    try {
      const data = await getAllPhotos({
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


      setPhotos(data.results);
      setNextUrl(data.next);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load photos");
    } finally {
      setLoadingPhotos(false);
    }
  };

  const reset = async () => {
    setLoadingPhotos(true);
    try {
      setSearchQuery("");
      setSort("-uploadDate");
      setFindMe(false);
      setStartingDate("");
      setEndingDate("");
      setShowDateFilters(false);

      const data = await getAllPhotos({ offset: 0, ordering: "-uploadDate" });
      setPhotos(data.results);
      setNextUrl(data.next);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load photos");
    } finally {
      setLoadingPhotos(false);
    }
  };

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

      setPhotos((prev) => prev.filter((photo) => !res.deleted.includes(photo.photoid)));

      handleClear();
    } catch (err) {
      toast.error("Failed to delete selected photos");
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

 // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0062ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  // 2. Auth Check
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
           <p className="text-red-500 font-bold">Please log in to view your gallery.</p>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard
  return (
    <div className="relative min-h-screen w-full bg-white font-sans overflow-hidden">
      
      {/* --- Background Aesthetics (Blobs & Pattern) --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(70px, -50px) scale(1.1); }
          66% { transform: translate(-40px, 60px) scale(0.9); }
        }
        .animate-float-1 { animation: float 25s infinite ease-in-out; }
        .animate-float-2 { animation: float 30s infinite ease-in-out -5s; }
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 40px 40px;
        }
      `}</style>
      <div className="absolute inset-0 bg-dot-pattern opacity-40 z-0 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-2 pointer-events-none" style={{ backgroundColor: '#ff9999' }} />


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
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
            Photos <span className="text-[#0062ff]">Gallery</span>
          </h1>
          <p className="text-slate-500 font-medium">Browse and discover all your photos</p>
        </div>

        {/* Selection Bar (Conditional) */}
        

        {/* Search, Sort & Filters Card */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all">
            
            {/* Main Controls Row */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              
              {/* Search Bar */}
              <div className="flex-1 min-w-[300px] relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#0062ff] transition-colors" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium"
                  // Type-Safe Focus Styles
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0062ff';
                    e.target.style.boxShadow = '0 0 0 4px rgba(0, 98, 255, 0.1)';
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

              {/* Find Me Toggle */}
              <button
                onClick={() => setFindMe(!FindMe)}
                className={`px-6 py-4 rounded-2xl font-bold transition-all active:scale-95 border ${
                  FindMe
                    ? "bg-[#0062ff] text-white border-[#0062ff] shadow-lg shadow-blue-200"
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                }`}
              >
                Find Me
              </button>

              {/* Date Filter Toggle */}
              <button
                onClick={() => setShowDateFilters(!showDateFilters)}
                className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 border ${
                  showDateFilters || startingDate || endingDate
                    ? "bg-[#aaff99] text-[#1a4d1a] border-[#aaff99]"
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <Calendar size={18} />
                Date Range
              </button>
            </div>

            {/* Date Range Filters (Collapsible Logic) */}
            {showDateFilters && (
              <div className="flex flex-wrap gap-4 items-end pt-6 pb-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                  <input
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#0062ff] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                  <input
                    type="date"
                    value={endingDate}
                    min={startingDate} // Logic preserved
                    onChange={(e) => setEndingDate(e.target.value)}
                    className="p-3 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#0062ff] transition-colors"
                  />
                </div>

                {(startingDate || endingDate) && (
                  <button
                    onClick={() => {
                      setStartingDate("");
                      setEndingDate("");
                    }}
                    className="px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors mb-[1px]"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            )}

            {/* Sort & Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 mt-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sort by:</label>
                <div className="relative">
                  <select
                    value={Sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-xl px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <option value="-uploadDate">Newest First</option>
                    <option value="uploadDate">Oldest First</option>
                    <option value="-viewcount">Most Viewed</option>
                    <option value="-likecount">Most Liked</option>
                    <option value="-commentcount">Most Commented</option>
                    <option value="-FaceCount">Most People</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={applyFilters}
                  disabled={selectionMode || loadingPhotos}
                  className={`px-6 py-3 font-bold rounded-xl transition-all shadow-lg ${
                    selectionMode || loadingPhotos
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-[#0062ff] hover:bg-[#004ecc] text-white shadow-blue-200 hover:-translate-y-0.5"
                  }`}
                >
                  {loadingPhotos ? "Applying..." : "Apply Filters"}
                </button>

                {(searchQuery || FindMe || startingDate || endingDate || Sort !== "-uploadDate") && (
                  <button
                    onClick={reset}
                    disabled={selectionMode || loadingPhotos}
                    className={`px-6 py-3 font-bold rounded-xl transition-all ${
                      selectionMode || loadingPhotos
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-500 hover:text-red-600 hover:bg-red-50"
                    }`}
                  >
                    Reset All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 mb-6">
            <div className="bg-[#ffe5e5] border-l-4 border-[#ff3333] text-[#990000] px-6 py-4 rounded-r-xl font-medium shadow-sm flex items-center gap-3">
              <span>⚠️</span> {error}
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {loadingPhotos ? (
          <div className="max-w-7xl mx-auto px-6 pb-20">
            <div className="text-center py-24">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0062ff] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Curating your gallery...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 pb-24">
            {photos.length === 0 ? (
              <div className="text-center py-24 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-100">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No photos found</h3>
                <p className="text-slate-500">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {photos.map((photo) => (
                  <div key={photo.photoid} className="group transition-transform hover:scale-[1.02] duration-300">
                    <PhotoCard
                      photo={photo}
                      selected={selectedIds.has(photo.photoid)}
                      selectionMode={selectionMode}
                      onToggleSelect={toggleSelect}
                      onClick={() => {
                        if (!selectionMode) {
                          setSelectedPhoto(photo);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Sentinel for Infinite Scroll */}
            <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-8">
              {fetchingMore && (
                 <div className="w-8 h-8 border-4 border-slate-100 border-t-[#0062ff] rounded-full animate-spin" />
              )}
              {!nextUrl && photos.length > 0 && (
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">End of Gallery</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Highlight Modal */}
      {selectedPhoto && !selectionMode && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-xl animate-in fade-in duration-300">
           <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
        </div>
      )}

      {/* 5. Delete Confirmation Modal (Styled) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl shadow-black/20 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Delete {selectedIds.size} photo{selectedIds.size !== 1 ? "s" : ""}?
            </h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              This action is permanent and cannot be undone. These memories will be removed from your gallery forever.
            </p>
            
            <div className="flex gap-3">
              <button
                className="flex-1 px-6 py-3.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Forever"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotosGallery;