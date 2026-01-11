
import {  Download } from "lucide-react";


interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

function SelectionBar({ count, onClear, onDelete , onDownload}: SelectionBarProps) {
  return (
  <div className="fixed top-16 left-0 right-0 z-60 bg-black/65 backdrop-blur-md text-white shadow-2xl border-b border-white/10">
    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      
      {/* Counter */}
      <div className="flex items-center gap-4">
        <span className="text-[15px] font-black uppercase tracking-[0.2em] text-neutral-500">
          Batch Action
        </span>
        <div className="h-3 w-px bg-white/20"></div>
        <span className="font-black text-sm uppercase tracking-widest">
          {count} <span className="text-white/60 text-[15px]">Selected</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDelete}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm text-[15px] font-black uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        >
          Delete
        </button>
        <button
          onClick={onDownload}
          className="px-6 py-2 bg-green-600 hover:bg-red-700 text-white rounded-sm text-[15px] font-black uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        >
          <Download></Download>
        </button>

        <button
          onClick={onClear}
          className="px-6 py-2 bg-white text-black hover:bg-neutral-200 rounded-sm text-[15px] font-black uppercase tracking-[0.2em] transition-colors border border-white"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
);
}

export default SelectionBar;
