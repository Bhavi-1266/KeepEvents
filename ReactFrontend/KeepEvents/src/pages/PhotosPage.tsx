    import { getAllPhotos, getSearchedFilteredSortedPhotos , getNextSetPhotos  , DeletePhotos} from "../services/Photos";
    import { connectSocket, disconnectSocket, subscribe } from "../services/socket";
    import { useEffect, useState  , useRef} from "react";
    import type { Photo } from "../types/photos";
    import PhotoCard from "../components/PhotoCard";
    import HighlightPhoto from "../components/HighlightPhoto";
    import SelectionBar from "../components/selectionBar";
    import { toast } from "react-hot-toast";
    import { useNavigate } from "react-router-dom";
    import type { User } from "../types/user";
    import { getMe } from "../services/auth";
    import NavBar from "../components/navBar";

    function PhotosGallery() {
    const navigate = useNavigate();

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    const [selectedIds , setselectedIds] = useState<Set<number>>(new Set());
    const selectionMode = selectedIds.size > 0;


    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("");
    const [startingDate, setStartingDate] = useState("");
    const [endingDate, setEndingDate] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [loading, setLoading] = useState(true);

    const [filterApplied , setFilterApplied] = useState(false);

    const [nextUrl , setNextUrl] = useState<string | null>(null);
    const sentinelRef  = useRef<HTMLDivElement | null>(null);
    const [fetchingMore , setFetchingMore] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [UserRole , setUserRole] = useState<number>(3);

    // ✅ DRF-compatible ordering fields
    const sorts = [
        { value: "uploadDate", label: "Upload Date ↑" },
        { value: "-uploadDate", label: "Upload Date ↓" },
        { value: "photoid", label: "Photo ID ↑" },
        { value: "-photoid", label: "Photo ID ↓" },
    ];

    /* ---------------- AUTH ---------------- */
    useEffect(() => {
        const init = async () => {
        try {
            const me = await getMe();
            setCurrentUser(me.user);
            setUserRole(me.user.groups[0]);
            const data = await getAllPhotos( { offset: 0 } );
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

      connectSocket(currentUser.userid);

      // Cleanup on unmount only
      return () => {
        disconnectSocket();
      };
    }, [currentUser]); // Only reconnect if userId changes

    

    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!currentUser) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== currentUser.userid) return;
        // if (data.likedBy == currentUser.username) return;
        toast.success(`${data.likedBy  } liked your photo`);
        
      

        
      });

      return () => {
        unsubscribe();
      };
    } , [currentUser?.userid]); // Only resubscribe if userId changes


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
        } finally
        {
        setFetchingMore(false);
        }
    };

    /* ------------- APPLY FILTERS ------------- */
    const applyFilters = async () => {
        try {
        const data = await getSearchedFilteredSortedPhotos({
            search,
            ordering: sort,
            date_after: startingDate,
            date_before: endingDate,
        });

        setPhotos(data.results);
        setNextUrl(data.next);
        setFilterApplied(true);
        setError(null);
        } catch (err: any) {
        setError(err.message || "Failed to load photos");
        }
    };

    const reset = async () => {
        try {
        const data = await getAllPhotos( { offset: 0} );
        setPhotos(data.results);
        setNextUrl(data.next);
        setFilterApplied(false);
        setError(null);
        } catch (err: any) {
        setError(err.message || "Failed to load photos");
        }
    };

    const toggleSelect = (id: number) => {
        setselectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        };

        const handleClear = () => {
            setselectedIds(new Set());
        };

        const handleDelete = async () => {
            if (selectedIds.size === 0) return;
            
            try {
                const res = await DeletePhotos([...selectedIds]);

                const deletedCount = res.deleted?.length ?? 0;
                const skippedCount = res.skipped_no_permission?.length ?? 0;

                // ✅ Success toast
                if (deletedCount > 0) {
                toast.success(
                    `Deleted ${deletedCount} photo${deletedCount > 1 ? "s" : ""}`
                );
                }

                // ⚠️ Warning toast
                if (skippedCount > 0) {
                toast(
                    `Skipped ${skippedCount} photo${skippedCount > 1 ? "s" : ""} (no permission)`,
                    {
                    icon: "⚠️",
                    style: {
                        background: "#fff7ed",
                        color: "#92400e",
                    },
                    }
                );
                }

                // ℹ️ Informational case
                if (deletedCount === 0 && skippedCount > 0) {
                toast("No photos were deleted", { icon: "ℹ️" });
                }

                // 🧹 Update UI (remove deleted photos)
                setPhotos(prev =>
                prev.filter(photo => !res.deleted.includes(photo.photoid))
                );

                // Reset selection
                handleClear();
                

            } catch (err) {
                toast.error("Failed to delete selected photos");
                console.error(err);
            } finally {
                setDeleting(false);
                setConfirmDelete(false);
            }
            };


    if (loading) return <p>Loading...</p>;
    if (!currentUser) return <p>Not logged in</p>;

    return (
        <div className="min-h-screen bg-gray-50">
        <NavBar />

        {/* HEADER */}
        <h1 className="text-xl font-bold text-center p-4">
            Photos Gallery
        </h1>

        {/* FILTER BAR */}
        <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4 items-end">

            {/* Search */}
            <input
                type="text"
                placeholder="Search photos"
                className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* Sort */}
            <select
                defaultValue=""
                onChange={(e) => setSort(e.target.value)}
                className="w-56 p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
                <option value="" disabled>Sort</option>
                {sorts.map((s) => (
                <option key={s.value} value={s.value}>
                    {s.label}
                </option>
                ))}
            </select>

            {/* Date Range */}
            <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">From</label>
                <input
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="w-40 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                </div>

                <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">To</label>
                <input
                    type="date"
                    value={endingDate}
                    min={startingDate}
                    onChange={(e) => setEndingDate(e.target.value)}
                    className="w-40 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                </div>
            </div>

            {/* Apply */}
            <button
                onClick={() => {
                    if (selectionMode) return;
                    applyFilters();
                }}
                disabled={selectionMode}
                className={`
                    h-10 px-6 font-semibold rounded-lg shadow-sm transition
                    ${
                    selectionMode
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }
                `}
                >
                Apply
                </button>

                <button
                onClick={() => {
                    if (selectionMode) return;
                    reset();
                }}
                disabled={selectionMode}
                className={`
                    h-10 px-6 font-semibold rounded-lg shadow-sm transition
                    ${
                    selectionMode
                        ? filterApplied? "bg-gray-300 text-gray-500 cursor-not-allowed" : "hidden"
                        : filterApplied
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "hidden"
                    }
                `}
                >
                Reset
                </button>

            
            </div>
        </div>

        {/* ERROR */}
        {error && (
            <p className="text-red-500 text-center mt-4">
            {error}
            </p>
        )}
            {selectionMode && (
                <SelectionBar
                    count={selectedIds.size}
                    onClear={handleClear}
                    onDelete={() => {
                    setConfirmDelete(true);
                    console.log([...selectedIds]);
                    }}
                />
            )}

        {/* GRID */}
        <div
            className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
            gap-6
            p-6
            max-w-7xl
            mx-auto
            "
        >
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

        <div
            ref={sentinelRef}
            className="h-12 flex items-center justify-center"
            >
            {fetchingMore && <span className="text-gray-500">Loading more…</span>}
            {!nextUrl && <span className="text-gray-400">No more photos</span>}
        </div>


        {/* HIGHLIGHT MODAL */}
        {selectedPhoto &&!selectionMode && (
            <HighlightPhoto
            photo={selectedPhoto}
            onClick={() => setSelectedPhoto(null)}
            />
        )}

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
                This action is <strong>permanent</strong>.  
                The photo cannot be recovered.
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
        </div>
    );
    }

    export default PhotosGallery;
    