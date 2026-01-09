import { useEffect, useState, useRef } from "react";
import { getMe } from "../services/auth";
import { toast } from "react-hot-toast";
import { getMyClicksStats } from "../services/user.ts";
import type { UserActivitySummary } from "../types/user";
import { GetMyClicks, getNextSetPhotos, DeletePhotos } from "../services/Photos";
import { connectSocket, disconnectSocket, subscribe } from "../services/socket";
import NavBar from "../components/navBar";
import SelectionBar from "../components/selectionBar.tsx";
import HighlightPhoto from "../components/HighlightPhoto";
import { useNavigate } from "react-router-dom";
import PhotoCard from "../components/PhotoCard";
import type { User } from "../types/user";
import type { Photo } from "../types/photos.ts";
import { Search, Calendar } from "lucide-react";

function MyActivityPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

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

    connectSocket(currentUser.userid);

    return () => {
      disconnectSocket();
    };
  }, [currentUser]);

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

      {/* ERROR ALERT */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-center">
            {error}
          </div>
        </div>
      )}

      {summary && (
        <div className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
          {/* PROFILE SUMMARY CARD */}
          <div className="bg-white rounded-3xl shadow-lg p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {summary.user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{summary.user.username}</h2>
                <p className="text-gray-500 font-medium">{summary.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-gray-600">
              <span className="text-sm font-semibold">
                Member since: {summary.stats.first_upload_date ? new Date(summary.stats.first_upload_date).getFullYear() : "—"}
              </span>
            </div>
          </div>

          {/* STATS COUNTERS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Photos", value: summary.stats.total_photos },
              { label: "Likes", value: summary.stats.total_likes },
              { label: "Views", value: summary.stats.total_views },
              { label: "Downloads", value: summary.stats.total_downloads },
              { label: "Comments", value: summary.stats.total_comments },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value ?? 0}</p>
              </div>
            ))}
          </div>

          {/* INSIGHTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Tags */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span> Top Tags
              </h3>
              <div className="space-y-3">
                {summary.activity.top_tags.map((t) => (
                  <div key={t.tag} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-semibold text-gray-700">#{t.tag}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Locations */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span> Locations
              </h3>
              <div className="space-y-3">
                {summary.activity.top_locations.map((l) => (
                  <div key={l.location} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm font-semibold text-gray-700 line-clamp-1">{l.location}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg font-bold">{l.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Major Events */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span> Major Events
              </h3>
              <div className="space-y-3">
                {summary.activity.major_events.map((e) => (
                  <div key={e.event__eventid} className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm font-bold text-purple-900">{e.event__eventname}</p>
                    <p className="text-xs text-purple-600">{e.photo_count} photos contributed</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Bar */}
      {selectionMode && (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <SelectionBar count={selectedIds.size} onClear={handleClear} onDelete={() => setConfirmDelete(true)} />
        </div>
      )}

      {/* Search, Sort & Filters */}
      <div className="max-w-7xl mx-auto px-6 my-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search your photos..."
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
                FindMe ? "bg-blue-500 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                <option value="-likecount">Most Liked</option>
                <option value="-viewcount">Most Viewed</option>
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

      {/* PHOTO GRID SECTION */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-8">Your Gallery</h2>

        {loadingPhotos ? (
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading photos...</p>
          </div>
        ) : myClicks.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myClicks.map((photo) => (
                <PhotoCard
                  key={photo.photoid}
                  photo={photo}
                  selected={selectedIds.has(photo.photoid)}
                  selectionMode={selectionMode}
                  onToggleSelect={toggleSelect}
                  onClick={() => !selectionMode && setSelectedClick(photo)}
                />
              ))}
            </div>

            {/* INFINITE SCROLL SENTINEL */}
            <div ref={sentinelRef} className="h-32 flex items-center justify-center">
              {fetchingMore ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500 font-medium">Fetching more memories...</span>
                </div>
              ) : !nextUrl && myClicks.length > 0 ? (
                <span className="text-gray-400 font-medium italic">End of the line. No more photos to show.</span>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* HIGHLIGHT MODAL */}
      {selectedClick && !selectionMode && <HighlightPhoto photo={selectedClick} onClick={() => setSelectedClick(null)} />}

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

export default MyActivityPage;