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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-xl">Not logged in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Photos Gallery</h1>
        <p className="text-gray-600">Browse and discover all your photos</p>
      </div>

      {/* Selection Bar */}
      {selectionMode && (
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <SelectionBar
            count={selectedIds.size}
            onClear={handleClear}
            onDelete={() => setConfirmDelete(true)}
            onDownload={handleBulkDownload}
          />
        </div>
      )}

      {/* Search, Sort & Filters */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search photos..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>

            {/* Find Me Toggle */}
            <button
              onClick={() => setFindMe(!FindMe)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                FindMe
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Find Me
            </button>

            {/* Date Filter Toggle */}
            <button
              onClick={() => setShowDateFilters(!showDateFilters)}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                showDateFilters || startingDate || endingDate
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Calendar size={18} />
              Date Range
            </button>
          </div>

          {/* Date Range Filters (Collapsible) */}
          {showDateFilters && (
            <div className="flex gap-4 items-end pt-4 border-t">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">From</label>
                <input
                  type="date"
                  value={startingDate}
                  onChange={(e) => setStartingDate(e.target.value)}
                  className="w-40 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">To</label>
                <input
                  type="date"
                  value={endingDate}
                  min={startingDate}
                  onChange={(e) => setEndingDate(e.target.value)}
                  className="w-40 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(startingDate || endingDate) && (
                <button
                  onClick={() => {
                    setStartingDate("");
                    setEndingDate("");
                  }}
                  className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold"
                >
                  Clear Dates
                </button>
              )}
            </div>
          )}

          {/* Sort & Action Buttons Row */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={Sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="-uploadDate">Newest First</option>
                <option value="uploadDate">Oldest First</option>
                <option value="-viewcount">Most Viewed</option>
                <option value="-likecount">Most Liked</option>
                <option value="-commentcount">Most Commented</option>
                <option value="-FaceCount">Most People</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={applyFilters}
                disabled={selectionMode || loadingPhotos}
                className={`px-6 py-2 font-semibold rounded-xl transition ${
                  selectionMode || loadingPhotos
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                }`}
              >
                {loadingPhotos ? "Applying..." : "Apply Filters"}
              </button>

              {(searchQuery || FindMe || startingDate || endingDate || Sort !== "-uploadDate") && (
                <button
                  onClick={reset}
                  disabled={selectionMode || loadingPhotos}
                  className={`px-6 py-2 font-semibold rounded-xl transition ${
                    selectionMode || loadingPhotos
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-md"
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {loadingPhotos ? (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading photos...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          {photos.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No photos found</h3>
              <p className="text-gray-600">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.photoid}
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
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-12 flex items-center justify-center py-8">
            {fetchingMore && <span className="text-gray-500">Loading more…</span>}
            {!nextUrl && photos.length > 0 && <span className="text-gray-400">All photos loaded</span>}
          </div>
        </div>
      )}

      {/* Highlight Modal */}
      {selectedPhoto && !selectionMode && (
        <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">
              Delete {selectedIds.size} photo{selectedIds.size !== 1 ? "s" : ""}?
            </h3>
            <p className="text-gray-600 mb-6">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-6 py-3 border rounded-xl hover:bg-gray-50"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
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
  );
}

export default PhotosGallery;