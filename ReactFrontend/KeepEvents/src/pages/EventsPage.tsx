import { GetAllEvents , getSearchedFilteredSortedEvents } from "../services/events";
import { useEffect, useState } from "react";
import type { Event } from "../types/event";
import EventCard from "../components/EventCard";
import { useNavigate } from "react-router-dom";
import CreateCard from "../components/CreateCard";
import type {User}  from "../types/user";
import {getMe} from "../services/auth"
import NavBar from "../components/navBar";
import { subscribe } from "../services/socket";
import { toast } from "react-hot-toast";
import { useWebSocket } from "../contexts/WebSocketContext";

function EventsPage() {
        const navigate = useNavigate();
        const [events, setEvents] = useState<Event[]>([]);
        const [error, setError] = useState<string | null>(null);
        const { subscribe } = useWebSocket();

        const [currentUser, setCurrentUser] = useState<User | null>(null);
        const [loading, setLoading] = useState(true);
        const [locations, setLocations] = useState<Set<string>>(new Set<string>());
        const [Search, setSearch] = useState('');
        const [locationToFilter, setLocationToFilter] = useState<string[]>([]);
        const [sort, setSort] = useState('');
        const [UserRole, setUserRole] = useState<number>(3);
        const sorts = [
            { value: "eventdate", label: "Event Date ↑" },
            { value: "-eventdate", label: "Event Date ↓" },
            { value: "eventname", label: "Event Name ↑" },
            { value: "-eventname", label: "Event Name ↓" },
            { value: "eventtime", label: "Event Time ↑" },
            { value: "-eventtime", label: "Event Time ↓" },
            { value: "eventlocation", label: "Location ↑" },
            { value: "-eventlocation", label: "Location ↓" },
            ];

        const [startingDate, setStartingDate] = useState('');
        const [endingDate, setEndingDate] = useState('');

    useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getMe();
        setCurrentUser(data.user);
        setUserRole(data.user.groups[0]);
      } catch {
        setCurrentUser(null);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const getEvents = async () => {
      try {
        const data = await GetAllEvents( { limit: 20, offset: 0, ordering: "-eventdate" } );
        setEvents(data.results);
        const locations = new Set<string>();
        for (let i = 0; i < data.results.length; i++) {
            if (data.results[i].eventlocation){
                 locations.add(data.results[i].eventlocation || "unknown");
            }
        }
        setLocations(locations);
      } catch (err: any) {
        setError(err.message);
      }
    };

    getEvents();

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



 
  // Define the search handler to be used by the form
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page reload
    try {
      const data = await getSearchedFilteredSortedEvents({
        search: Search,
        eventlocation: locationToFilter,
        ordering: sort,
        eventDateFrom: startingDate,
        eventDateTo: endingDate
      });
      setEvents(data.results);
    } catch (err) {
      console.error(err);
    }
  };
if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          {/* Colorful Spinner */}
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#aaff99] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Events...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-[#fff0f0] p-8 rounded-[2rem] border border-red-100 shadow-xl">
           <p className="text-[#ff3333] font-black text-xl tracking-tight">Please log in to view events.</p>
        </div>
      </div>
    );
  }

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
        
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

      {/* Colorful Watercolor Blobs */}
      <div className="absolute top-[-5%] left-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#aaff99' }} /> {/* Green */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-25 animate-float-2 pointer-events-none" style={{ backgroundColor: '#ff9999' }} /> {/* Pink */}
      <div className="absolute top-[30%] right-[10%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[90px] opacity-20 animate-float-3 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}

      <div className="relative z-10">
        <NavBar />
      
        <div className="max-w-[1400px] mx-auto px-6 py-12 pb-24">
          
          {/* Page Header */}
          <div className="mb-10 flex items-end justify-between">
             <div>
                <span className="text-[#aaff99] font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                   <span className="w-10 h-[2px] bg-[#aaff99]"></span> Discover
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Events</h1>
             </div>
          </div>

          {/* Filter Container */}
          <div className="bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 mb-12">
            
            {/* Wrapped in form to enable "Enter" key submission */}
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-6 items-end">
              
              {/* Search Input - GREEN focus */}
              <div className="flex-1 min-w-[280px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Search
                </label>
                <input 
                  type="text"
                  placeholder="Find an event..."
                  className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 placeholder-slate-300 outline-none focus:border-[#aaff99] focus:ring-4 focus:ring-green-100 transition-all shadow-sm"
                  onChange={(e) => setSearch(e.target.value)}
                  value={Search}
                />
              </div>

              {/* Location Select - BLUE focus */}
              <div className="w-full sm:w-auto min-w-[200px]">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Location
                </label>
                <div className="relative">
                  <select 
                    defaultValue=""
                    onChange={(e) => {
                        const value = e.target.value;
                        if (!locationToFilter.includes(value)) {
                          setLocationToFilter([...locationToFilter, value]);
                        }
                        e.target.selectedIndex = 0;
                    }} 
                    name="location"
                    className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#99c0ff] focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="" disabled>Select Location</option>
                    {[...locations].map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                  {/* Custom Arrow */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Sort Select - ORANGE focus */}
              <div className="w-full sm:w-auto min-w-[200px]">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  Sort By
                </label>
                <div className="relative">
                  <select
                    defaultValue=""
                    onChange={(e) => setSort(e.target.value)}
                    name="sort"
                    className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#ffcc99] focus:ring-4 focus:ring-orange-100 transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="" disabled>Default</option>
                      {sorts.map((sort) => (
                          <option key={sort.value} value={sort.value}>
                          {sort.label}
                          </option>
                      ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Date Range - PINK focus */}
              <div className="flex gap-4 w-full xl:w-auto">
                <div>
                  <label htmlFor="start-date" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    From
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="w-full sm:w-40 bg-white border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#ff9999] focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="end-date" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    To
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endingDate}
                    min={startingDate} 
                    onChange={(e) => setEndingDate(e.target.value)}
                    className="w-full sm:w-40 bg-white border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 outline-none focus:border-[#ff9999] focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Search Button (Type Submit) */}
              <button
                type="submit" 
                className="w-full xl:w-auto h-[54px] bg-[#aaff99] hover:bg-[#99ee88] text-[#2f5c2f] rounded-2xl px-10 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-200 hover:-translate-y-1 active:scale-95 active:shadow-none"
              >
                Search
              </button>
            </form>

            {/* Active Location Chips */}
            {locationToFilter.length > 0 && (
               <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Filters:</span>
                  <div className="flex flex-wrap gap-2">
                      {locationToFilter.map(location => (
                          <div
                          key={location}
                          className="flex items-center gap-2 pl-4 pr-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wide border border-slate-200"
                          >
                              <span>{location}</span>
                              <button
                                  type="button" 
                                  onClick={() => { setLocationToFilter(locationToFilter.filter(loc => loc !== location)); }}
                                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-300 text-slate-400 hover:text-white transition-colors"
                              >
                                  ×
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-[#fff0f0] border-l-4 border-[#ff3333] text-[#cc0000] px-6 py-4 rounded-r-xl shadow-sm mb-8 font-bold text-sm flex items-center gap-3">
               <span>⚠️</span> {error}
            </div>
          )}

          {/* Events Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative">
              {/* Create Card - Matches CreateCard styling usually, but wrapper here for layout */}
              <div className="h-full min-h-[350px]">
                   <CreateCard ToCreate="Event" onClick={() => navigate("/EventsCreate")} />
              </div>
              
              {/* Render Events */}
              {events.length > 0 ? (
                  events.map((event) => (
                      <div key={event.eventid} className="transition-transform duration-300 hover:scale-[1.02]">
                        <EventCard
                            event={event}
                            onClick={() => navigate(`/Events/${event.eventid}`)}
                        />
                      </div>
                  ))
              ) : (
                  /* Empty State (if not initial load) */
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center h-full min-h-[350px] bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                       <div className="text-4xl mb-4 opacity-30">📅</div>
                       <span className="text-slate-400 text-xs font-black uppercase tracking-widest">
                          No events found
                       </span>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventsPage;


