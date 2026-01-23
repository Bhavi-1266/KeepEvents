
import type {Event}  from "../types/event.ts";
import type  {Photo} from "../types/photos.ts";

interface CreateCardProps {
  ToCreate: string;

  onClick?: () => void;
}

function CreateCard({ ToCreate, onClick }: CreateCardProps) {
 

  return (
    <div
      onClick={onClick}
      className="group relative h-full min-h-[300px] min-w-[250px] flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer hover:border-[#99c0ff] hover:bg-slate-50/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100/50 overflow-hidden"
    >
      {/* Background decoration on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Icon Circle */}
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-100 transition-all duration-300 z-10 border border-transparent group-hover:border-[#99c0ff]/20">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-10 h-10 text-slate-300 group-hover:text-[#99c0ff] transition-colors duration-300"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>

      {/* Text Content */}
      <div className="text-center z-10">
        <h2 className="text-xl font-black text-slate-400 group-hover:text-[#1e3a8a] transition-colors duration-300 tracking-tight">
          Add {ToCreate}    
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 group-hover:text-[#99c0ff] transition-colors mt-2 block">
          Create New
        </span>
      </div>
    </div>
  );
}

export default CreateCard;
