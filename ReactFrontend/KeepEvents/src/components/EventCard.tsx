import type { Event } from "../types/event";

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

function EventCard({ event, onClick }: EventCardProps) {


  return (
    <div
      onClick={onClick}
      className="
        group relative flex flex-col h-full
        bg-white
        rounded-[2.5rem]
        border border-slate-100 hover:border-[#99c0ff]/50
        shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(153,192,255,0.3)]
        cursor-pointer
        transition-all duration-300 ease-out
        hover:-translate-y-2
        overflow-hidden
      "
    >
      {/* Cover Image Container */}
      <div className="h-56 relative overflow-hidden bg-slate-50">
        {/* Overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {event.eventCoverPhoto_url ? (
          <img
            src={event.eventCoverPhoto_url}
            alt={event.eventname}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#fffbf5] group-hover:bg-[#fff5eb] transition-colors">
            <img
              src={"../../src/assets/NotFound.png"}
              alt="Not Found"
              className="h-20 w-auto opacity-50 mb-2"   
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ffcc99]">No Image</span>
          </div>
        )}
        
        {/* Date Badge (Floating) */}
        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
             {event.eventdate}
           </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col">
        
        {/* Time Tag */}
        <div className="mb-2">
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#99c0ff]">
             {event.eventtime}
           </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-slate-800 leading-tight mb-3 group-hover:text-[#1e3a8a] transition-colors">
          {event.eventname}
        </h2>

        {/* Description */}
        <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6 leading-relaxed">
          {event.eventdesc}
        </p>

        {/* Footer (Location & User) */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          
          {/* Location */}
          <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#aaff99] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px]">
              {event.eventlocation}
            </span>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff9999] to-[#ffcc99] flex items-center justify-center text-[8px] font-black text-white">
                {event.eventCreator_detail.username.charAt(0).toUpperCase()}
             </div>
             <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
               {event.eventCreator_detail.username}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventCard;
