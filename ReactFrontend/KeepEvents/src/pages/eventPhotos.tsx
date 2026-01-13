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
import { removeEventViewer  , removeEventEditor} from "../services/events.ts";
import NavBar from "../components/navBar.tsx";
import SelectionBar from "../components/selectionBar";
import { toast } from "react-hot-toast";
import { Eye, Users, Edit3, Save, X, Pencil, Eraser, Camera, Download } from "lucide-react";

import JSZip from "jszip";
import { useWebSocket } from "../contexts/WebSocketContext";



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
  
  //Websocket
  const { subscribe } = useWebSocket();

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
    if (!eventId) {
      setError("Invalid event ID");
      return;
    }
    setLoadingPhotos(true);
    try {
      const data = await LoadEventPhotos(Number(eventId), 0);
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
  }, [eventId]);

  // ✅ Bulk Download Handler
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
  };
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

  const handleRemoveUser = async (userid: number , Editor: boolean) => {
    toast.loading("Removing user...");
    if (userid === currentUser?.userid) {
      toast.dismiss();
      toast.error("You cannot remove yourself");

      return;
    }

    if (userid) {
      try {
        if (!Editor) {
          await removeEventViewer(Number(eventId), userid);
        } else {
          await removeEventEditor(Number(eventId), userid);
        }
        toast.success("User removed");
        loadEventPeople();
      } catch (err) {
        toast.error("Failed to remove user");
      }finally {
        toast.dismiss();
        toast.success("User removed");
      }
    }

  }

  // ✅ Connect to WebSocket ONCE when user is available
    // useEffect(() => {
    //   if (!currentUser) return;

    //   connectSocket(currentUser.userid);

    //   // Cleanup on unmount only
    //   return () => {
    //     disconnectSocket();
    //   };
    // }, [currentUser]); // Only reconnect if userId changes

    // ✅ Subscribe to event photo changes
    // useEffect(() => {
    //   if (!eventId) return;

    //   const unsubscribe = subscribe("event_photos_changed", (data) => {
    //     if (data.eventid !== Number(eventId)) return;
    //     toast.success("Event updated");
        
    //     // Reload photos
    //     LoadEventPhotos(Number(eventId), 0).then((photosData) => {
    //       setPhotos(photosData.results || []);
    //       setNextUrl(photosData.next || null);
    //     });
    //   });

    //   return () => {
    //     unsubscribe();
    //   };
    // }, [eventId , subscribe]); // Only resubscribe if eventId changes

    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!currentUser) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== currentUser.userid) return;
        if (data.likedById == currentUser.userid) return;
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
    } , [currentUser?.userid , subscribe]); // Only resubscribe if userId changes

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
        filters: { event: eventId  , FindMe: FindMe ? "true" : "false" },
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

 // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#99c0ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Event...</p>
        </div>
      </div>
    );
  }

  // 2. Auth/Error State
  if (!currentUser || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-[#fff0f0] p-8 rounded-[2rem] border border-red-100 shadow-xl text-center">
          <p className="text-[#ff3333] font-black text-xl tracking-tight mb-2">Access Denied</p>
          <p className="text-slate-500 font-medium">{error || "Please log in to view this event."}</p>
        </div>
      </div>
    );
  }

  // 3. Main Event Page
  return (
    <div className="relative min-h-screen w-full bg-white font-sans overflow-hidden text-slate-800">
      
      {/* --- Background Aesthetics --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(5deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(-5deg); }
        }
        .animate-float-1 { animation: float 25s infinite ease-in-out; }
        .animate-float-2 { animation: float 22s infinite ease-in-out -2s; }
        .animate-float-3 { animation: float 30s infinite ease-in-out -10s; }
        .animate-float-4 { animation: float 28s infinite ease-in-out -5s; }
        
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

      {/* Colorful Watercolor Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#ff9999' }} /> {/* Pink */}
      <div className="absolute top-[20%] left-[-10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-2 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}
      <div className="absolute bottom-[-10%] right-[10%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-25 animate-float-3 pointer-events-none" style={{ backgroundColor: '#aaff99' }} /> {/* Green */}
      <div className="absolute top-[40%] left-[20%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[90px] opacity-15 animate-float-4 pointer-events-none" style={{ backgroundColor: '#ffcc99' }} /> {/* Orange */}

      <div className="relative z-10">
        <NavBar />
      
        {/* Event Header */}
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white p-8 mb-10 relative overflow-hidden group/card">
            
            {/* Top Gradient Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff9999] via-[#aaff99] to-[#99c0ff]"></div>

            {/* Cover Photo */}
            <div className="relative mb-8 rounded-[2rem] overflow-hidden shadow-sm aspect-[21/9] bg-slate-100 group">
              <img
                src={coverImageFile ? URL.createObjectURL(coverImageFile) : event?.eventCoverPhoto_url || "/default-cover.jpg"}
                alt="Event Cover"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Cover Photo Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"></div>

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
                    className={`absolute bottom-6 right-6 p-4 rounded-2xl shadow-lg backdrop-blur-md transition-all hover:scale-105 ${
                      coverImageFile 
                      ? "bg-[#ff3333]/90 text-white" 
                      : "bg-white/90 text-slate-700 hover:bg-white hover:text-[#0062ff]"
                    }`}
                  >
                    {coverImageFile ? <Eraser size={20} /> : <Camera size={20} />}
                  </button>
                </>
              )}
            </div>

            {/* Event Name */}
            <div className="mb-8 border-b border-slate-100 pb-8">
              {editingField === "eventname" ? (
                <div className="flex gap-4 items-center animate-in fade-in">
                  <input
                    value={editData.eventname}
                    onChange={(e) => updateEventField("eventname", e.target.value)}
                    className="text-4xl font-black text-slate-900 bg-transparent border-b-2 border-[#ffcc99] w-full py-2 outline-none placeholder-slate-300"
                    placeholder="Event Name"
                    autoFocus
                  />
                  <button onClick={() => revertEventField("eventname")} className="p-3 bg-red-50 text-[#ff3333] rounded-xl hover:bg-red-100 transition-colors">
                    <Eraser size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 group/title">
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{editData.eventname}</h1>
                  {canEditEvent() && (
                    <button 
                      onClick={() => setEditingField("eventname")} 
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover/title:opacity-100 transition-all hover:bg-[#ffcc99] hover:text-white"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Description */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-[#99c0ff]"></span> Description
                </p>
                {editingField === "eventdesc" ? (
                  <div className="flex gap-3 animate-in fade-in">
                    <textarea
                      value={editData.eventdesc || ""}
                      onChange={(e) => updateEventField("eventdesc", e.target.value)}
                      className="flex-1 bg-white border border-[#99c0ff] p-4 rounded-2xl outline-none shadow-sm text-sm font-medium"
                      rows={4}
                    />
                    <button onClick={() => revertEventField("eventdesc")} className="p-3 bg-red-50 text-[#ff3333] rounded-xl h-fit hover:bg-red-100">
                      <Eraser size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 group/desc">
                    <p className="text-slate-600 font-medium leading-relaxed flex-1 whitespace-pre-wrap">
                      {editData.eventdesc || <span className="text-slate-300 italic">No description added yet.</span>}
                    </p>
                    {canEditEvent() && (
                      <button 
                        onClick={() => setEditingField("eventdesc")} 
                        className="p-2 bg-white text-slate-400 border border-slate-100 rounded-lg opacity-0 group-hover/desc:opacity-100 transition-all hover:border-[#99c0ff] hover:text-[#99c0ff]"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Location & Date & Visibility */}
              <div className="space-y-6">
                
                {/* Location */}
                <div className="bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50 flex flex-col justify-center min-h-[5rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                  {editingField === "eventlocation" ? (
                    <div className="flex gap-3 animate-in fade-in">
                      <input
                        value={editData.eventlocation || ""}
                        onChange={(e) => updateEventField("eventlocation", e.target.value)}
                        className="flex-1 bg-transparent border-b border-[#aaff99] py-1 outline-none font-bold text-slate-800"
                        autoFocus
                      />
                      <button onClick={() => revertEventField("eventlocation")} className="text-[#ff3333] hover:bg-red-50 p-1 rounded">
                        <Eraser size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group/loc">
                      <p className="text-lg font-bold text-slate-800">{editData.eventlocation || "Not set"}</p>
                      {canEditEvent() && (
                        <button onClick={() => setEditingField("eventlocation")} className="text-slate-300 hover:text-[#aaff99] opacity-0 group-hover/loc:opacity-100 transition-opacity">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50 flex flex-col justify-center min-h-[5rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                  {editingField === "eventdate" ? (
                    <div className="flex gap-3 animate-in fade-in">
                      <input
                        type="date"
                        value={editData.eventdate || ""}
                        onChange={(e) => updateEventField("eventdate", e.target.value)}
                        className="flex-1 bg-transparent border-b border-[#ff9999] py-1 outline-none font-bold text-slate-800"
                      />
                      <button onClick={() => revertEventField("eventdate")} className="text-[#ff3333] hover:bg-red-50 p-1 rounded">
                        <Eraser size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group/date">
                      <p className="text-lg font-bold text-slate-800">
                        {editData.eventdate ? new Date(editData.eventdate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Not set"}
                      </p>
                      {canEditEvent() && (
                        <button onClick={() => setEditingField("eventdate")} className="text-slate-300 hover:text-[#ff9999] opacity-0 group-hover/date:opacity-100 transition-opacity">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Visibility */}
                <div className="bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100/50 flex flex-col justify-center min-h-[5rem]">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visibility</p>
                  {editingField === "visibility" ? (
                    <div className="flex gap-3 animate-in fade-in">
                      <select
                        value={editData.visibility}
                        onChange={(e) => updateEventField("visibility", e.target.value)}
                        className="flex-1 bg-white border border-[#ffcc99] rounded-lg p-2 text-sm font-bold text-slate-700 outline-none"
                      >
                        <option value="admin">Admin Only</option>
                        <option value="img">IMG Member</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <button onClick={() => revertEventField("visibility")} className="text-[#ff3333] hover:bg-red-50 p-1 rounded">
                        <Eraser size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group/vis">
                      <span className={`px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wide ${
                        editData.visibility === 'public' ? 'bg-[#f0fdf4] text-[#4ade80]' :
                        editData.visibility === 'private' ? 'bg-[#fff0f0] text-[#ff6666]' :
                        'bg-blue-50 text-[#99c0ff]'
                      }`}>
                        {editData.visibility}
                      </span>
                      {canEditEvent() && (
                        <button onClick={() => setEditingField("visibility")} className="text-slate-300 hover:text-[#ffcc99] opacity-0 group-hover/vis:opacity-100 transition-opacity">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Info + Invite Controls */}
            <div className="mt-10 pt-8 border-t border-slate-100 space-y-6">

              {/* Counts + Toggles */}
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={() => {
                    setShowViewersBox(v => !v);
                    setShowEditorsBox(false);
                  }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all border ${
                    showViewersBox 
                    ? "bg-[#eff6ff] border-[#99c0ff] text-[#0062ff]" 
                    : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Eye className={`w-5 h-5 ${showViewersBox ? "text-[#0062ff]" : "text-slate-400"}`} />
                  <div className="flex flex-col items-start">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Viewers</span>
                     <span className="font-black text-lg leading-none">{loadingPeople ? "..." : viewers.length}</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowEditorsBox(v => !v);
                    setShowViewersBox(false);
                  }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all border ${
                    showEditorsBox 
                    ? "bg-[#f0fdf4] border-[#aaff99] text-[#16a34a]" 
                    : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Users className={`w-5 h-5 ${showEditorsBox ? "text-[#16a34a]" : "text-slate-400"}`} />
                  <div className="flex flex-col items-start">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Editors</span>
                     <span className="font-black text-lg leading-none">{loadingPeople ? "..." : editors.length}</span>
                  </div>
                </button>

                {canEditEvent() && (
                  <div className="flex gap-3 ml-auto">
                    <button
                      onClick={() => handleInvite("editor")}
                      className="px-6 py-3 bg-[#aaff99] text-[#14532d] font-bold rounded-2xl hover:bg-[#88ee77] shadow-lg shadow-green-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                      + Invite Editor
                    </button>
                    <button
                      onClick={() => handleInvite("viewer")}
                      className="px-6 py-3 bg-[#99c0ff] text-[#1e3a8a] font-bold rounded-2xl hover:bg-[#77aaff] shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                      + Invite Viewer
                    </button>
                  </div>
                )}
              </div>

              {/* Editors Box */}
              {showEditorsBox && (
                <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-black text-sm uppercase tracking-widest text-[#16a34a] mb-4 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span> Editors List
                  </h4>
                  {editors.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium italic">No editors assigned.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {editors.map((u) => (
                        <div key={u.id} className="px-4 py-3 bg-[#f0fdf4] rounded-xl text-sm font-bold text-[#16a34a] flex justify-between items-center border border-green-100">
                          {u.username}
                          {currentUser.userid == event?.eventCreator && u.id !== event?.eventCreator && (
                            <button
                              onClick={() => handleRemoveUser(u.userid , true)}
                              className="ml-2 text-[#ff3333] hover:bg-[#ff3333] hover:text-white transition duration-200 bg-white rounded-lg w-6 h-6 flex items-center justify-center shadow-sm"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Viewers Box */}
              {showViewersBox && (
                <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-black text-sm uppercase tracking-widest text-[#0062ff] mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0062ff]"></span> Viewers List
                  </h4>
                  {viewers.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium italic">No viewers invited.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {viewers.map((u) => (
                        <div key={u.id} className="px-4 py-3 bg-[#eff6ff] rounded-xl text-sm font-bold text-[#0062ff] flex justify-between items-center border border-blue-100">
                          {u.username} 
                          {currentUser.userid == event?.eventCreator && u.id !== event?.eventCreator && (
                            <button
                              onClick={() => handleRemoveUser(u.userid , false)}
                              className="ml-2 text-[#ff3333] hover:bg-[#ff3333] hover:text-white transition duration-200 bg-white rounded-lg w-6 h-6 flex items-center justify-center shadow-sm"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selection Bar Sticky */}
        {selectionMode && (
          <div className="max-w-7xl mx-auto px-6 mb-6 sticky top-6 z-50">
             <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 rounded-full p-2">
              <SelectionBar
                count={selectedIds.size}
                onClear={handleClear}
                onDelete={() => setConfirmDelete(true)}
                onDownload={handleBulkDownload}
              />
            </div>
          </div>
        )}

        {/* Search and Sort Toolbar */}
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 tracking-tight pl-2">Gallery</h3>
            
            <div className="flex items-center gap-4">
              {/* Find Me Toggle - Pink */}
              <button
                onClick={() => setFindMe(!FindMe)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  FindMe 
                  ? "bg-[#ff9999] text-white shadow-lg shadow-pink-200" 
                  : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                }`}
              >
                Find Me
              </button>
              
              <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
              
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort:</p>
                <div className="relative">
                  <select
                    value={Sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 outline-none focus:border-[#ffcc99] cursor-pointer"
                  >
                    <option value="-uploadDate">Newest</option>
                    <option value="photoid">Oldest</option>
                    <option value="-likecount">Most Liked</option>
                    <option value="-viewcount">Most Viewed</option>
                    <option value="-commentcount">Most Comments</option>
                    <option value="-FaceCount">Most People</option>
                  </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- PHOTOS GRID --- */}
        {loadingPhotos ? (
          <div className="max-w-7xl mx-auto px-6 pb-20">
            <div className="text-center py-24">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-[#ffb366] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Loading memories...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 pb-32">
            {photos.length === 0 ? (
              <div className="text-center py-24 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200">
                <h3 className="text-2xl font-black text-slate-800 mb-2">No photos yet</h3>
                <p className="text-slate-500 mb-6 font-medium">Capture the moment and add the first photo.</p>
                {canEditEvent() && (
                  <div className="inline-block">
                    <CreateCard ToCreate="Photo" onClick={() => setShowAddPhotos(true)} />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {canEditEvent() && (
                  <div className="h-full min-h-[250px] transition-transform hover:scale-[1.02] active:scale-95">
                    <CreateCard ToCreate="Photo" onClick={() => setShowAddPhotos(true)} />
                  </div>
                )}
                {photos.map((photo) => (
                  <div key={photo.photoid} className="transition-transform duration-300 hover:scale-[1.02]">
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
            )}

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="h-20 flex items-center justify-center py-8">
              {fetchingMore && <div className="w-6 h-6 border-2 border-slate-200 border-t-[#ff9999] rounded-full animate-spin" />}
              {!nextUrl && photos.length > 0 && <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">End of Gallery</span>}
            </div>
          </div>
        )}

        {/* --- MODALS --- */}
        
        {/* Highlight Photo Modal */}
        {selectedPhoto && !selectionMode && (
          <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl animate-in fade-in">
             <HighlightPhoto photo={selectedPhoto} onClick={() => setSelectedPhoto(null)} />
          </div>
        )}

        {/* Add Photos Modal */}
        {showAddPhotos && eventId && (
          <AddPhotosModal 
            eventId={Number(eventId)} 
            onClose={() => setShowAddPhotos(false)} 
            sucessCallback={() => {
              toast.success("Photos added successfully") 
              reloadPhotos();
            }} 
            failureCallback={() => toast.error("Failed to add photos") } 
          />
        )}

        {/* Delete Confirmation Modal - Red Theme */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl shadow-red-900/10">
              <div className="w-14 h-14 bg-[#fff0f0] rounded-full flex items-center justify-center text-[#ff3333] mb-6 mx-auto">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-2xl font-black text-center text-slate-900 mb-2">
                Delete {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}?
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

        {/* Save/Discard Floating Action Bar */}
        {hasEventChanges && (
          <div className="fixed bottom-8 right-8 flex gap-4 z-[90] animate-in slide-in-from-bottom-4">
            <button
              onClick={discardEventChanges}
              className="bg-white border border-slate-200 text-slate-600 px-6 py-4 rounded-2xl flex items-center gap-2 shadow-2xl hover:bg-slate-50 font-bold uppercase text-xs tracking-widest transition-transform hover:-translate-y-1"
            >
              <X size={18} />
              Discard
            </button>
            <button
              onClick={saveEventChanges}
              className="bg-[#aaff99] text-[#14532d] px-8 py-4 rounded-2xl flex items-center gap-2 shadow-2xl shadow-green-200 hover:bg-[#88ee77] font-bold uppercase text-xs tracking-widest transition-transform hover:-translate-y-1"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventPhotos;
