import { LoadEventPhotos, GetNextPhotos, EventData, getEventViewers } from "../services/events.ts";
import {getEventEditors, patchEventData, patchEventCoverImage , createEventInvite } from "../services/events.ts";
import { DeletePhotos ,getAllPhotos , getNextSetPhotos} from "../services/Photos.ts";
import { useEffect, useState, useRef, useCallback } from "react";
import type { Photo } from "../types/photos.ts";
import PhotoCard from "../components/PhotoCard.tsx";
import { useNavigate, useParams } from "react-router-dom";
import HighlightPhoto from "../components/HighlightPhoto.tsx";
import CreateCard from "../components/CreateCard.tsx";
import AddPhotosModal from "../components/AddPhotosModal.tsx";
import type { User } from "../types/user";
import { getMe } from "../services/auth.ts";
import NavBar from "../components/navBar.tsx";
import SelectionBar from "../components/selectionBar";
import { toast } from "react-hot-toast";
import { Eye, Users, Edit3, Save, X, Pencil, Eraser, Camera } from "lucide-react";


import { connectSocket , subscribe  , disconnectSocket} from "../services/socket.ts";


function EventPhotos() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  
  // Event data
  const [event, setEvent] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [hasEventChanges, setHasEventChanges] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Photos & pagination
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [fetchingMore, setFetchingMore] = useState(false);

  // Selection & UI
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewersBox, setShowViewersBox] = useState(false);
  const [showEditorsBox, setShowEditorsBox] = useState(false);


  // User & loading
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<number>(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Event people
  const [viewers, setViewers] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  //Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [FindMe , setFindMe] = useState(false);
  const [Sort , setSort] = useState("");

  const reloadPhotos = useCallback(async () => {
    window.location.reload();
  }, [eventId]);


  // ✅ Load initial data
  useEffect(() => {
    const init = async () => {
      if (!eventId) {
        setError("Invalid event ID");
        setLoading(false);
        return;
      }

      try {
        const [me, eventData, photosData] = await Promise.all([
          getMe(),
          EventData(Number(eventId)),
          LoadEventPhotos(Number(eventId), 0)
        ]);

        setCurrentUser(me.user);
        setUserRole(me.user.groups[0] || 3);
        setEvent(eventData);
        setEditData({
          eventname: eventData.eventname,
          eventdesc: eventData.eventdesc,
          eventdate: eventData.eventdate,
          eventlocation: eventData.eventlocation,
          visibility: eventData.visibility,
        });
        setPhotos(photosData.results || []);
        setNextUrl(photosData.next || null);
        setError(null);
      } catch (err: any) {
        console.error("Load failed:", err);
        navigate("/", { replace: true });
        if (err.message?.includes("401") || err.message?.includes("403")) {
          
        } else {
          setError(err.message || "Failed to load event");
        }
      } finally {
        setLoading(false);
      }

    };

    init();
  }, [eventId, navigate]);



  // ✅ Connect to WebSocket ONCE when user is available
    useEffect(() => {
      if (!currentUser) return;

      connectSocket(currentUser.userid);

      // Cleanup on unmount only
      return () => {
        disconnectSocket();
      };
    }, [currentUser]); // Only reconnect if userId changes

    // ✅ Subscribe to event photo changes
    useEffect(() => {
      if (!eventId) return;

      const unsubscribe = subscribe("event_photos_changed", (data) => {
        if (data.eventid !== Number(eventId)) return;
        toast.success("Event updated");
        
        // Reload photos
        LoadEventPhotos(Number(eventId), 0).then((photosData) => {
          setPhotos(photosData.results || []);
          setNextUrl(photosData.next || null);
        });
      });

      return () => {
        unsubscribe();
      };
    }, [eventId]);

    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!currentUser) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== currentUser.userid) return;
        // if (data.likedBy == currentUser.username) return;
        toast.success(`${data.likedBy  } liked your photo`);
        
        setPhotos(prev => 
          prev.map(p => 
            p.photoid === data.photoid 
              ? { ...p, likes: (p.likes || 0) + 1 } 
              : p
          )   
        );

        
      });

      return () => {
        unsubscribe();
      };
    } , [currentUser?.userid]); // Only resubscribe if userId changes


  // ✅ Load event people
  const loadEventPeople = async () => {
    if (!eventId) return;
    setLoadingPeople(true);
    try {
      const [viewersData, editorsData] = await Promise.all([
        getEventViewers(Number(eventId)),
        getEventEditors(Number(eventId))
      ]);
      setViewers(viewersData || []);
      setEditors(editorsData || []);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoadingPeople(false);
    }
  };

  const handleInvite = async (role: "viewer" | "editor") => {
    if (!eventId) return;
    try {
      const expiresAt = new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString();

      const res = await createEventInvite(Number(eventId), role , expiresAt);
      await navigator.clipboard.writeText(res.invite_url);
      toast.success(`${role} invite link copied`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create invite");
    }
  };



  useEffect(() => {
    loadEventPeople();
  }, [eventId]);

  // ✅ Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchingMore && nextUrl) {
          loadMore();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextUrl, fetchingMore]);

  useEffect(() => {
    GetSortedPhotos();
  }
  , [Sort , FindMe]);


  const GetSortedPhotos = async () => {
    
    if (!eventId) return;
    setLoadingPhotos(true);
    try {
      const data = await getAllPhotos({
        offset: 0,
        limit: 20,
        ordering: Sort,
        filters: { event_id: eventId  , FindMe: FindMe ? "true" : "false" },
      });
      setPhotos(data.results || []);
      setNextUrl(data.next || null);
    } catch (err: any) {
      console.error("Load failed:", err);
      if (err.message?.includes("401") || err.message?.includes("403")) {
        navigate("/", { replace: true });
      } else {
        setError(err.message || "Failed to load event");
      }
    } finally {
      setLoadingPhotos(false);
    }
  }



  // ✅ Load more
  const loadMore = useCallback(async () => {
    if (fetchingMore || !nextUrl) return;
    setFetchingMore(true);
    try {
      const data = await getNextSetPhotos(nextUrl);
      setPhotos(prev => [...prev, ...(data.results || [])]);
      setNextUrl(data.next || null);
    } catch {
      setError("Failed to load more");
    } finally {
      setFetchingMore(false);
    }
  }, [nextUrl, fetchingMore]);

  // ✅ Event editing
  const updateEventField = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
    setHasEventChanges(true);
  };

  const revertEventField = (field: string) => {
    if (!event) return;
    setEditData((prev: any) => ({ ...prev, [field]: event[field] }));
    setEditingField(null);
  };


  const discardEventChanges = () => {
    if (!event) return;
    setEditData({
      eventname: event.eventname,
      eventdesc: event.eventdesc,
      eventdate: event.eventdate,
      eventlocation: event.eventlocation,
      visibility: event.visibility,
    });
    setCoverImageFile(null);
    setEditingField(null);
    setHasEventChanges(false);
  };

  // const ReloadPhotos = async () => {
  //   if (!eventId) return;
  //   try {
  //     const data = await LoadEventPhotos(Number(eventId), 0);
  //     setPhotos(data.results || []);
  //     setNextUrl(data.next || null);
  //   } catch (err: any) {
  //     console.error("Load failed:", err);
  //     if (err.message?.includes("401") || err.message?.includes("403")) {
  //       navigate("/", { replace: true });
  //     } else {
  //       setError(err.message || "Failed to load event");
  //     }
  //   }
  // }
  const saveEventChanges = async () => {
    if (!event || !eventId) return;
    try {
      if (coverImageFile) {
        await patchEventCoverImage(Number(eventId), coverImageFile);
      }
      const res = await patchEventData(Number(eventId), editData);
      setEvent(res);
      setEditData({
        eventname: res.eventname,
        eventdesc: res.eventdesc,
        eventdate: res.eventdate,
        eventlocation: res.eventlocation,
        visibility: res.visibility,
      });
      setCoverImageFile(null);
      setEditingField(null);
      setHasEventChanges(false);
      toast.success("Event updated!");
    } catch {
      toast.error("Failed to save changes");
    }
  };

  // ✅ Photo selection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleClear = () => setSelectedIds(new Set());

  // ✅ Delete photos
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await DeletePhotos([...selectedIds]);
      const deletedCount = res.deleted?.length ?? 0;
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} photo${deletedCount > 1 ? "s" : ""}`);
        setPhotos(prev => prev.filter(p => !res.deleted?.includes(p.photoid)));
      }
      handleClear();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const canEditEvent = () => {
    console.log(event.myrole);
    return event?.myrole === "owner" || event?.myrole === "editor";
    
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

  if (!currentUser || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-xl">{error || "Not logged in"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      {/* Event Header - EDITABLE */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8">
          {/* Cover Photo */}
          <div className="relative mb-8 rounded-2xl overflow-hidden">
            <img
              src={coverImageFile ? URL.createObjectURL(coverImageFile) : event?.eventCoverPhoto_url || "/default-cover.jpg"}
              alt="Event Cover"
              className="w-full h-64 object-cover"
            />
            {canEditEvent() && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && (setCoverImageFile(e.target.files[0]), setHasEventChanges(true))}
                />
                <button
                  onClick={coverImageFile ? () => setCoverImageFile(null) : () => fileInputRef.current?.click()}
                  className={`absolute top-4 right-4 p-3 rounded-full shadow-lg ${
                    coverImageFile ? "bg-red-500 text-white" : "bg-white hover:bg-gray-100"
                  }`}
                >
                  {coverImageFile ? <Eraser size={20} /> : <Camera size={20} />}
                </button>
              </>
            )}
          </div>

          {/* Event Name */}
          <div className="mb-6">
            {editingField === "eventname" ? (
              <div className="flex gap-2 items-center">
                <input
                  value={editData.eventname}
                  onChange={(e) => updateEventField("eventname", e.target.value)}
                  className="text-3xl font-bold border-2 border-blue-500 p-3 rounded-xl flex-1"
                />
                <button onClick={() => revertEventField("eventname")} className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Eraser size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{editData.eventname}</h1>
                {canEditEvent() && (
                  <button onClick={() => setEditingField("eventname")} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                    <Pencil size={18} />
                  </button>
                )}
              </div>
            )}
          </div>

          

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Description */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
              {editingField === "eventdesc" ? (
                <div className="flex gap-2">
                  <textarea
                    value={editData.eventdesc || ""}
                    onChange={(e) => updateEventField("eventdesc", e.target.value)}
                    className="flex-1 border-2 border-blue-500 p-3 rounded-xl"
                    rows={3}
                  />
                  <button onClick={() => revertEventField("eventdesc")} className="p-2 bg-red-100 text-red-600 rounded-lg h-fit">
                    <Eraser size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="text-gray-700 flex-1">{editData.eventdesc || "No description"}</p>
                  {canEditEvent() && (
                    <button onClick={() => setEditingField("eventdesc")} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg mt-1">
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Location & Date */}
            <div className="space-y-6">
              {/* Location */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Location</p>
                {editingField === "eventlocation" ? (
                  <div className="flex gap-2">
                    <input
                      value={editData.eventlocation || ""}
                      onChange={(e) => updateEventField("eventlocation", e.target.value)}
                      className="flex-1 border-2 border-blue-500 p-3 rounded-xl"
                    />
                    <button onClick={() => revertEventField("eventlocation")} className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <Eraser size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-gray-700">{editData.eventlocation || "Not set"}</p>
                    {canEditEvent() && (
                      <button onClick={() => setEditingField("eventlocation")} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <Pencil size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Date</p>
                {editingField === "eventdate" ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editData.eventdate || ""}
                      onChange={(e) => updateEventField("eventdate", e.target.value)}
                      className="flex-1 border-2 border-blue-500 p-3 rounded-xl"
                    />
                    <button onClick={() => revertEventField("eventdate")} className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <Eraser size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-gray-700">{editData.eventdate ? new Date(editData.eventdate).toLocaleDateString() : "Not set"}</p>
                    {canEditEvent() && (
                      <button onClick={() => setEditingField("eventdate")} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <Pencil size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Visibility</p>
                {editingField === "visibility" ? (
                  <div className="flex gap-2">
                    <select
                      value={editData.visibility}
                      onChange={(e) => updateEventField("visibility", e.target.value)}
                      className="flex-1 border-2 border-blue-500 p-3 rounded-xl"
                    >
                      <option value="admin">Admin</option>
                      <option value="img">IMG Member</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                    <button onClick={() => revertEventField("visibility")} className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <Eraser size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold capitalize">
                      {editData.visibility}
                    </span>
                    {canEditEvent() && (
                      <button onClick={() => setEditingField("visibility")} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                        <Pencil size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Member Info */}
            {/* Member Info + Invite Controls */}
            <div className="mt-8 pt-6 border-t space-y-4">

              {/* Counts + Toggles */}
              <div className="flex gap-6 items-center">
                <button
                  onClick={() => {
                    setShowViewersBox(v => !v);
                    setShowEditorsBox(false);
                  }}
                  className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl hover:bg-blue-100"
                >
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">
                    Viewers: {loadingPeople ? "..." : viewers.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowEditorsBox(v => !v);
                    setShowViewersBox(false);
                  }}
                  className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100"
                >
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold">
                    Editors: {loadingPeople ? "..." : editors.length}
                  </span>
                </button>

                {canEditEvent() && (
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleInvite("editor")}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Invite Editor
                    </button>
                    <button
                      onClick={() => handleInvite("viewer")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Invite Viewer
                    </button>
                  </div>
                )}
              </div>

              {/* Editors Box */}
              {showEditorsBox && (
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold mb-3 text-emerald-700">Editors</h4>
                  {editors.length === 0 ? (
                    <p className="text-sm text-gray-500">No editors</p>
                  ) : (
                    <ul className="space-y-2">
                      {editors.map((u) => (
                        <li
                          key={u.id}
                          className="px-3 py-2 bg-emerald-50 rounded-lg text-sm"
                        >
                          {u.username}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Viewers Box */}
              {showViewersBox && (
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <h4 className="font-semibold mb-3 text-blue-700">Viewers</h4>
                  {viewers.length === 0 ? (
                    <p className="text-sm text-gray-500">No viewers</p>
                  ) : (
                    <ul className="space-y-2">
                      {viewers.map((u) => (
                        <li
                          key={u.id}
                          className="px-3 py-2 bg-blue-50 rounded-lg text-sm"
                        >
                          {u.username}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Photos Section */}
      {selectionMode && (
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <SelectionBar
            count={selectedIds.size}
            onClear={handleClear}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>
      )}



      {/* Search and Sort */}
          <div className="max-w-7xl mx-auto px-6 ">
            <div className="flex items-center justify-end gap-4 mb-4">
              
              <button
                onClick={() => setFindMe(!FindMe)}
                className={`px-4 py-2 rounded-lg ${
                  FindMe ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                Find Me
              </button>
              <p>Sort BY: </p>
              <select
                value={Sort}
                onChange={(e) => setSort(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="-uploadDate">Newest First</option>
                <option value="photoid">Oldest First</option>
                <option value="-likecount">Most Liked</option>
                <option value="-viewcount">Most Viewed</option>
                <option value="-commentcount">Most Commented</option>
                <option value="-FaceCount">Most People</option>
              </select>
            </div>
          </div>
      {  loadingPhotos ? (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading photos...</p>
          </div>
        </div>
      ) :  
       ( <div className="max-w-7xl mx-auto px-6 pb-20">
          {photos.length === 0 ? (
            <div className="text-center py-24">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">No photos yet</h3>
              {canEditEvent() && (
                <CreateCard ToCreate="Photo" onClick={() => setShowAddPhotos(true)} />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {canEditEvent() && (
                <CreateCard ToCreate="Photo" onClick={() => setShowAddPhotos(true)} />
              )}
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.photoid}
                  photo={photo}
                  selected={selectedIds.has(photo.photoid)}
                  selectionMode={selectionMode}
                  onToggleSelect={toggleSelect}
                  onClick={() => !selectionMode && setSelectedPhoto(photo)}
                />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-12 flex items-center justify-center py-8">
            {fetchingMore && <span className="text-gray-500">Loading more…</span>}
            {!nextUrl && photos.length > 0 && <span className="text-gray-400">All photos loaded</span>}
          </div>
        </div>
        )
      }
      {/* Modals & Dialogs */}
      {selectedPhoto && !selectionMode && (
        <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
      )}

      {showAddPhotos && eventId && (
        <AddPhotosModal eventId={Number(eventId)} onClose={() => setShowAddPhotos(false)} sucessCallback={() => {
          toast.success("Photos added successfully") 
          reloadPhotos();
        }
        } failureCallback={() => toast.error("Failed to add photos") } />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Delete {selectedIds.size} photo{selectedIds.size !== 1 ? "s" : ""}?</h3>
            <p className="text-gray-600 mb-6">This action is permanent.</p>
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

      {/* Save/Discard Event Changes */}
      {hasEventChanges && (
        <div className="fixed bottom-6 right-6 flex gap-3 z-50">
          <button
            onClick={discardEventChanges}
            className="bg-gray-200 px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:bg-gray-300"
          >
            <X size={18} />
            Discard
          </button>
          <button
            onClick={saveEventChanges}
            className="bg-green-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg hover:bg-green-700"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default EventPhotos;
