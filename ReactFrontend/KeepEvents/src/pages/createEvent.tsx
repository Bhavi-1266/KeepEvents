import { useEffect, useState } from "react";
import type { Event } from "../types/event";
import type { User } from "../types/user";
import {  CreateEventApi } from "../services/events";
import { useNavigate } from "react-router-dom";
import toast  from "react-hot-toast";
import {getMe}  from "../services/auth";
import NavBar from "../components/navBar";

import { useWebSocket } from "../contexts/WebSocketContext";

type CreateEventForm = Pick<
  Event,
  | "eventname"
  | "eventdesc"
  | "eventdate"
  | "eventtime"
  | "eventlocation"
  | "visibility"
>;

function CreateEvent() {
  const [form, setForm] = useState<CreateEventForm>({
    eventname: "",
    eventdesc: "",
    eventdate: "",
    eventtime: "",
    eventlocation: "",
    visibility: "public",
  });

  const { subscribe } = useWebSocket();

  const [error , setError] = useState<string | null>(null);
  // Logged-in user (event manager / creator)

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getMe();
        setCurrentUser(data.user);
      } catch {
        setCurrentUser(null);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  
    // ✅ Subscribe to photo likes
    useEffect(() => {
      if (!currentUser) return;

      const unsubscribe = subscribe("photo_liked", (data) => {
        if (data.userid !== currentUser.userid) return;
        if (data.likedById == currentUser.userid) return;
        toast.success(`${data.likedBy  } liked your photo`);
        
        
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


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);

    CreateEventApi(form)
      .then((data) => {
        console.log(data);
        toast.success("Event created successfully");

        navigate("/HomePage");
      })
      .catch((err) => {
        toast.error("Event creation failed");

      });
  };

 // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          {/* Colorful Spinner */}
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#ffcc99] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Form...</p>
        </div>
      </div>
    );
  }

  // 2. Auth Check
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-[#fff0f0] p-8 rounded-[2rem] border border-red-100 shadow-xl text-center">
           <p className="text-[#ff3333] font-black text-xl tracking-tight">Access Denied</p>
           <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Please log in first</p>
        </div>
      </div>
    );
  }

  // 3. Main Form
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
        .animate-float-2 { animation: float 28s infinite ease-in-out -5s; }
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

      {/* Colorful Watercolor Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#ffcc99' }} /> {/* Orange */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-2 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}

      <div className="relative z-10">
        <NavBar />
        
        <div className="flex items-center justify-center py-12 px-6">
          <div className="bg-white/70 backdrop-blur-3xl max-w-xl w-full rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-white p-8 sm:p-10 relative overflow-hidden">
            
            {/* Top Gradient Decoration */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#ff9999] via-[#ffcc99] to-[#aaff99]"></div>

            {/* Header */}
            <div className="mb-10 text-center">
               <span className="text-[#ffcc99] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 mb-2">
                 <span className="w-8 h-[2px] bg-[#ffcc99]"></span> New Entry <span className="w-8 h-[2px] bg-[#ffcc99]"></span>
               </span>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Create Event</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Error Message */}
              {error && (
                <div className="bg-[#fff0f0] border-l-4 border-[#ff3333] text-[#cc0000] p-4 rounded-r-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-in fade-in">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Read Only User */}
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Organizer
                </label>
                <div className="relative">
                  <input
                    value={currentUser ? currentUser.username : "Loading..."}
                    disabled
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 cursor-not-allowed uppercase tracking-wide"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                </div>
              </div>

              {/* Event Name - BLUE Focus */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Event Name
                </label>
                <input
                  name="eventname"
                  placeholder="e.g. Summer Roadtrip 2024"
                  value={form.eventname}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-[#99c0ff] focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  required
                />
              </div>

              {/* Description - ORANGE Focus */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Description
                </label>
                <textarea
                  name="eventdesc"
                  placeholder="What's happening?"
                  value={form.eventdesc ?? ""}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-[#ffcc99] focus:ring-4 focus:ring-orange-50 transition-all shadow-sm resize-none"
                />
              </div>

              {/* Date & Time Row - PINK Focus */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="eventdate"
                    value={form.eventdate ?? ""}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none focus:border-[#ff9999] focus:ring-4 focus:ring-red-50 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="eventtime"
                    value={form.eventtime ?? ""}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none focus:border-[#ff9999] focus:ring-4 focus:ring-red-50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Location - GREEN Focus */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Location
                </label>
                <div className="relative">
                  <input
                    name="eventlocation"
                    placeholder="Add a location"
                    value={form.eventlocation ?? ""}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 pl-11 text-sm font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-[#aaff99] focus:ring-4 focus:ring-green-50 transition-all shadow-sm"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                </div>
              </div>

              {/* Visibility - SLATE Focus */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Visibility
                </label>
                <div className="relative">
                  <select
                    name="visibility"
                    value={form.visibility}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="public">Public</option>
                    <option value="img">IMG Only</option>
                    <option value="admin">Admin Only</option>
                    <option value="private">Private</option>
                  </select>
                  {/* Custom Chevron */}
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#aaff99] hover:bg-[#99ee88] text-[#14532d] py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg shadow-green-100 hover:-translate-y-1 active:translate-y-0 active:shadow-none mt-6"
              >
                Publish Event
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;
