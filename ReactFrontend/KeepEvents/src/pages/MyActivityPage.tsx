import { useEffect , useState , useRef} from "react";
import {getMe} from "../services/auth";
import { toast } from "react-hot-toast";
import { getMyClicksStats } from "../services/user.ts";
import type { UserActivitySummary } from "../types/user";
import { GetMyClicks , getNextSetPhotos , DeletePhotos } from "../services/Photos";
import { connectSocket , disconnectSocket , subscribe } from "../services/socket";
import NavBar from "../components/navBar";
import SelectionBar from "../components/selectionBar.tsx";
import HighlightPhoto from "../components/HighlightPhoto";
import { useNavigate } from "react-router-dom";
import PhotoCard from "../components/PhotoCard";
import type { User } from "../types/user";
import type {Photo} from "../types/photos.ts"


function MyActivityPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const navigate = useNavigate();

    const [myClicks , setMyClicks] = useState<Photo[]>([]);
    const [selectedClick, setSelectedClick] = useState<Photo | null>(null);

    const [selectedIds , setselectedIds] = useState<Set<number>>(new Set());
    const selectionMode = selectedIds.size > 0;


    const [error, setError] = useState<string | null>(null);

    const [nextUrl , setNextUrl] = useState<string | null>(null);
    const sentinelRef  = useRef<HTMLDivElement | null>(null);
    const [fetchingMore , setFetchingMore] = useState(false);

    const [summary, setSummary] = useState<UserActivitySummary | null>(null);


    const LazyLoading = async () => {
    if (fetchingMore || !nextUrl) {
        return ;
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
            const checkAuth = async () => {
                try {
                    const data = await getMe();
                    setCurrentUser(data.user);
                } catch {
                        navigate("/");
                }
            };
            checkAuth();   
            getPhotos(currentUser?.userid!);
            const loadSummary = async () => {
                try {
                    const data = await getMyClicksStats();
                    setSummary(data);
                } catch (error) {
                    console.error(error);
                }
            };
            loadSummary();
        }, []);
      useEffect(() => {
            const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                LazyLoading();
            }
            } , { threshold: 0.1 ,
                    root : null,
                    rootMargin : "200px"
            });
            if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
            }
            return () => {
            if (sentinelRef.current) {
                observer.unobserve(sentinelRef.current);
            }
            };
        })

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
    
    const getPhotos = async (userId: number) => {
        try {
            const data = await GetMyClicks(userId);
            setMyClicks(data.results);
            setNextUrl(data.next);
        } catch (error) {
            console.error(error);
        }
    }


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
            setMyClicks(prev =>
            prev.filter(photo => !res.deleted.includes(photo.photoid))
            );

            // Reset selection
            handleClear

        } catch (err) {
            toast.error("Failed to delete selected photos");
            console.error(err);
        }
        };


     const handleClear = () => {
        setSelectedClick(null);
        setselectedIds(new Set());
        };
    const toggleSelect = (id: number) => {
            setselectedIds(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
            });
        };

    return (
        <div>
            <NavBar />
            {/* ERROR */}
            {error && (
                <p className="text-red-500 text-center mt-4">
                {error}
                </p>
            )}

            {summary && (
                <div className="max-w-7xl mx-auto p-6 space-y-6">

                    {/* USER INFO */}
                    <div className="bg-white p-4 rounded-xl shadow">
                    <h2 className="text-lg font-semibold">{summary.user.username}</h2>
                    <p className="text-gray-600">{summary.user.email}</p>
                    <p className="text-sm text-gray-500">
                        First upload:{" "}
                        {summary.stats.first_upload_date
                        ? new Date(summary.stats.first_upload_date).toDateString()
                        : "—"}
                    </p>
                    </div>

                    {/* TOTALS */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        ["Photos", summary.stats.total_photos],
                        ["Likes", summary.stats.total_likes],
                        ["Views", summary.stats.total_views],
                        ["Downloads", summary.stats.total_downloads],
                        ["Comments", summary.stats.total_comments],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-white p-4 rounded-xl shadow text-center">
                        <p className="text-sm text-gray-500">{label}</p>
                        <p className="text-xl font-bold">{value ?? 0}</p>
                        </div>
                    ))}
                    </div>

                    {/* INSIGHTS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="bg-white p-4 rounded-xl shadow">
                        <h3 className="font-semibold mb-2">Top Tags</h3>
                        {summary.activity.top_tags.map(t => (
                        <div key={t.tag} className="flex justify-between text-sm">
                            <span>{t.tag}</span>
                            <span>{t.count}</span>
                        </div>
                        ))}
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow">
                        <h3 className="font-semibold mb-2">Top Locations</h3>
                        {summary.activity.top_locations.map(l => (
                        <div key={l.location} className="flex justify-between text-sm">
                            <span>{l.location}</span>
                            <span>{l.count}</span>
                        </div>
                        ))}
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow">
                        <h3 className="font-semibold mb-2">Major Events</h3>
                        {summary.activity.major_events.map(e => (
                        <div key={e.event__eventid} className="text-sm">
                            {e.event__eventname} ({e.photo_count})
                        </div>
                        ))}
                    </div>

                    </div>

                </div>
            )}


            {/* GRID */}
            <div>
                {selectionMode && (
                    <SelectionBar
                        count={selectedIds.size}
                        onClear={handleClear}
                        onDelete={handleDelete}
                    />
                    )}

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
                    {myClicks.map((photo) => (
                        <PhotoCard
                            key={photo.photoid}
                            photo={photo}
                            selected={selectedIds.has(photo.photoid)}
                            selectionMode={selectionMode}
                            onToggleSelect={toggleSelect}
                            onClick={() => {
                            if (!selectionMode) {
                                setSelectedClick(photo);
                            }
                            }}
                        />
                        ))}

                </div>
            </div>
            <div
                ref={sentinelRef}
                className="h-12 flex items-center justify-center"
                >
                {fetchingMore && <span className="text-gray-500">Loading more…</span>}
                {!nextUrl && <span className="text-gray-400">No more photos</span>}
            </div>


            {/* HIGHLIGHT MODAL */}
            {(selectedClick &&  !selectionMode) && (
                <HighlightPhoto
                photo={selectedClick}
                onClick={() => setSelectedClick(null)}
                />
            )}
        </div>
    )
}

export default MyActivityPage