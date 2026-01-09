import { useEffect, useState } from "react";
import type { Event } from "../types/event";
import type { User } from "../types/user";
import {  CreateEventApi } from "../services/events";
import { useNavigate } from "react-router-dom";
import toast  from "react-hot-toast";
import {getMe}  from "../services/auth";
import NavBar from "../components/navBar";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fefae0]/40">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#bc6c25] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#606c38]">
            Loading Form
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

  return (
    <div className="min-h-screen bg-[#fefae0]/30 font-sans text-[#283618]">
      <NavBar />
      
      <div className="flex items-center justify-center py-12 px-4">
        <div className="bg-white max-w-lg w-full rounded-xl shadow-xl shadow-[#283618]/5 border border-[#dda15e]/20 p-8">
          
          {/* Header */}
          <div className="mb-8 text-center">
             <span className="text-[#bc6c25] font-black text-[10px] uppercase tracking-[0.3em]">New Entry</span>
             <h2 className="text-3xl font-black text-[#283618] tracking-tighter uppercase mt-1">Create Event</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-xs font-bold uppercase tracking-wide text-center">
                {error}
              </div>
            )}

            {/* Read Only User */}
            <div>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Organizer
              </label>
              <input
                value={currentUser ? currentUser.username : "Loading..."}
                disabled
                className="w-full bg-[#606c38]/10 border border-transparent rounded-lg px-4 py-3 text-xs font-bold text-[#606c38] cursor-not-allowed uppercase tracking-wide"
              />
            </div>

            {/* Event Name */}
            <div>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Event Name
              </label>
              <input
                name="eventname"
                placeholder="ENTER EVENT NAME..."
                value={form.eventname}
                onChange={handleChange}
                className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] placeholder:text-[#606c38]/40 outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Description
              </label>
              <textarea
                name="eventdesc"
                placeholder="DESCRIBE THE EVENT..."
                value={form.eventdesc ?? ""}
                onChange={handleChange}
                rows={4}
                className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] placeholder:text-[#606c38]/40 outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide resize-none"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="eventdate"
                  value={form.eventdate ?? ""}
                  onChange={handleChange}
                  className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                  Time
                </label>
                <input
                  type="time"
                  name="eventtime"
                  value={form.eventtime ?? ""}
                  onChange={handleChange}
                  className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Location
              </label>
              <input
                name="eventlocation"
                placeholder="ENTER LOCATION..."
                value={form.eventlocation ?? ""}
                onChange={handleChange}
                className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] placeholder:text-[#606c38]/40 outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-widest mb-2">
                Visibility
              </label>
              <div className="relative">
                <select
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                  className="w-full bg-[#fefae0]/30 border border-[#606c38]/20 rounded-lg px-4 py-3 text-xs font-bold text-[#283618] outline-none focus:border-[#bc6c25] transition-colors uppercase tracking-wide appearance-none cursor-pointer"
                >
                  <option value="public">PUBLIC</option>
                  <option value="img">IMG ONLY</option>
                  <option value="admin">ADMIN ONLY</option>
                  <option value="private">PRIVATE</option>
                </select>
                {/* Custom Chevron for select */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#606c38]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#bc6c25] hover:bg-[#283618] text-[#fefae0] py-4 rounded-lg font-black uppercase tracking-[0.15em] text-xs transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 mt-4"
            >
              Publish Event
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEvent;
