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
        // if (data.likedBy == currentUser.username) return;
        toast.success(`${data.likedBy  } liked your photo`);
        
      

        
      });

      return () => {
        unsubscribe();
      };
    } , [currentUser?.userid , subscribe]); // Only resubscribe if userId changes


 if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefae0]/40">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#bc6c25] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#606c38]">
            Loading Events
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefae0]/40">
        <p className="text-[#606c38] font-black uppercase tracking-widest text-xs">
          Not logged in
        </p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#fefae0]/30 font-sans text-[#283618]">
      <NavBar />
      
      <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-12">
        
        {/* Page Header */}
        <div className="mb-8 flex items-end justify-between">
           <div>
              <span className="text-[#bc6c25] font-black text-[10px] uppercase tracking-[0.3em]">Discover</span>
              <h1 className="text-4xl font-black text-[#283618] tracking-tighter uppercase mt-1">Events</h1>
           </div>
        </div>

        {/* Filter Container */}
        <div className="bg-white rounded-xl shadow-xl shadow-[#283618]/5 border border-[#dda15e]/20 p-6 mb-10">
          
          {/* Wrapped in form to enable "Enter" key submission */}
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-end">
            
            {/* Search Input */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Search
              </label>
              <input 
                type="text"
                placeholder="SEARCH EVENTS..."
                className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] placeholder:text-[#606c38]/40 outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                onChange={(e) => setSearch(e.target.value)}
                value={Search}
              />
            </div>

            {/* Location Select */}
            <div className="w-full sm:w-auto">
               <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Add Location
              </label>
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
                className="w-full sm:w-56 bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide appearance-none cursor-pointer"
              >
                <option value="" disabled>SELECT LOCATION</option>
                {[...locations].map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Sort Select */}
            <div className="w-full sm:w-auto">
               <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Sort By
              </label>
              <select
                defaultValue=""
                onChange={(e) => setSort(e.target.value)}
                name="sort"
                className="w-full sm:w-56 bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide appearance-none cursor-pointer"
                >
                    <option value="" disabled>DEFAULT</option>
                    {sorts.map((sort) => (
                        <option key={sort.value} value={sort.value}>
                        {sort.label}
                        </option>
                    ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex gap-2 w-full sm:w-auto">
              <div>
                <label htmlFor="start-date" className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                  From
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={startingDate}
                  onChange={(e) => setStartingDate(e.target.value)}
                  className="w-full sm:w-36 bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-3 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                />
              </div>

              <div>
                <label htmlFor="end-date" className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                  To
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={endingDate}
                  min={startingDate} 
                  onChange={(e) => setEndingDate(e.target.value)}
                  className="w-full sm:w-36 bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-3 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                />
              </div>
            </div>

            {/* Search Button (Type Submit) */}
            <button
              type="submit" 
              className="w-full sm:w-auto h-[42px] bg-[#bc6c25] hover:bg-[#283618] text-[#fefae0] rounded-lg px-8 text-xs font-black uppercase tracking-widest transition-all hover:shadow-lg active:scale-95"
            >
              Search
            </button>
          </form>

          {/* Active Location Chips */}
          {locationToFilter.length > 0 && (
             <div className="mt-6 pt-4 border-t border-[#dda15e]/20 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-[#bc6c25] uppercase tracking-widest">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                    {locationToFilter.map(location => (
                        <div
                        key={location}
                        className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-[#283618] text-[#fefae0] rounded-lg text-[10px] font-bold uppercase tracking-wide"
                        >
                            <span>{location}</span>
                            <button
                                type="button" 
                                onClick={() => { setLocationToFilter(locationToFilter.filter(loc => loc !== location)); }}
                                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#bc6c25] text-[#fefae0] transition-colors"
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
          <p className="text-red-600 font-bold uppercase text-xs tracking-widest text-center mb-6 bg-red-100 py-2 rounded">
            {error}
          </p>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative">
            {/* Create Card */}
            <div className="h-full min-h-[300px]">
                 <CreateCard ToCreate="Event" onClick={() => navigate("/EventsCreate")} />
            </div>
            
            {/* Render Events */}
            {events.length > 0 ? (
                events.map((event) => (
                    <EventCard
                        key={event.eventid}
                        event={event}
                        onClick={() => navigate(`/Events/${event.eventid}`)}
                    />
                ))
            ) : (
                /* Empty State (if not initial load) */
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex items-center justify-center h-full min-h-[300px] border-2 border-dashed border-[#606c38]/20 rounded-xl">
                     <span className="text-[#606c38] text-xs font-bold uppercase tracking-widest opacity-60">
                        No events found
                     </span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default EventsPage;


