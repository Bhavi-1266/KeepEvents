import { GetAllEvents , getSearchedFilteredSortedEvents } from "../services/events";
import { connectSocket, disconnectSocket } from "../services/socket";
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


function EventsPage() {
        const navigate = useNavigate();
        const [events, setEvents] = useState<Event[]>([]);
        const [error, setError] = useState<string | null>(null);
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


  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <p>Not logged in</p>;
  }

    return (
        <div className="min-h-screen bg-gray-50">
          <NavBar />
            <div className="mx-6 mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4 items-end">

            <input 
                type="text"
                placeholder="Search events"
                className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                setSearch(e.target.value);
                }
                }
                value={Search}
            />
              <select 
              defaultValue=""
                onChange={(e) => {
                    
                        const value = e.target.value;

                        if (!locationToFilter.includes(value)) {
                        setLocationToFilter([...locationToFilter, value]);
                        }

                        e.target.selectedIndex = 0;
                    
                }} 
                name = "location"
                className="w-56 p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>All locations</option>
                {[...locations].map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>

              <select
                defaultValue=""
                onChange={(e) => {
                    setSort(e.target.value);
                }}
                name="sort"
                className="w-56 p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="" disabled>
                        Sort
                    </option>

                    {sorts.map((sort) => (
                        <option key={sort.value} value={sort.value}>
                        {sort.label}
                        </option>
                    ))}
              </select>


                <div className="flex gap-3 items-end">
                {/* Start Date */}
                <div className="flex flex-col gap-1">
                    <label
                    htmlFor="start-date"
                    className="text-sm font-medium text-gray-700"
                    >
                    From
                    </label>
                    <input
                    id="start-date"
                    type="date"
                    value={startingDate}
                    onChange={(e) => setStartingDate(e.target.value)}
                    className="w-40 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* End Date */}
                <div className="flex flex-col gap-1">
                    <label
                    htmlFor="end-date"
                    className="text-sm font-medium text-gray-700"
                    >
                    To
                    </label>
                    <input
                    id="end-date"
                    type="date"
                    value={endingDate}
                    min={startingDate}   // prevents invalid range
                    onChange={(e) => setEndingDate(e.target.value)}
                    className="w-40 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                </div>




            <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={async () => {
                try {
                const data = await getSearchedFilteredSortedEvents({
                    search: Search,
                    eventlocation: locationToFilter,
                    ordering: sort,
                    eventDateFrom: startingDate,
                    eventDateTo: endingDate
                });

                setEvents(data.results); // or data.results (see note below)
                } catch (err) {
                console.error(err);
                }
            }}
            >
            Search
            </button>

              </div>
                <div  className="flex flex-row gap-4">
                    <div>locations : </div>
                    <div className="flex flex-row gap-4">
                        {locationToFilter.map(location => (
                            <div
                            key={location}
                            className="flex items-center gap-2 px-3 py-1 bg-gray-200 rounded-full text-sm"
                            >
                                <span>{location}</span>

                                <button
                                    onClick={() => { setLocationToFilter(locationToFilter.filter(loc => loc !== location)); }}
                                    className="w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-xs leading-none cursor-pointer hover:bg-red-600 z-10"
                                >
                                    ×
                                </button>
                            </div>

                        ))}
                    </div>
                </div>
            </div>
          {error && (
            <p className="text-red-500 text-center mb-4">
              {error}
            </p>
          )}

          {events.length === 0 ? (

            <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
                gap-6
                p-6
                max-w-7xl
                mx-auto
                relative
                ">
                {<CreateCard ToCreate="Event" onClick={() => navigate("/EventsCreate")} />}
                
                </div>
          ) : (
                <div className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
                gap-6
                p-6
                max-w-7xl
                mx-auto
                relative
                ">
                {<CreateCard ToCreate="Event" onClick={() => navigate("/EventsCreate")} />}
                {events.map((event) => (
                    <EventCard
                    key={event.eventid}
                    event={event}
    
                    onClick={() => navigate(`/Events/${event.eventid}`)}
                    />
                ))}
                </div>
            )}
      </div>

    );
}

export default EventsPage;


