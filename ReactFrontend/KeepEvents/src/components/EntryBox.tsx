import  '../styles/loginPage.css';

type EntryBoxProps = {
  displayText: string;
  onClick?: () => void;
};

function EntryBox({ displayText, onClick }: EntryBoxProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="
        group relative
        inline-flex items-center justify-center
        px-8 py-4
        bg-white hover:bg-[#f8fafc]
        border-2 border-slate-100 hover:border-[#99c0ff]
        rounded-[1.5rem]
        shadow-[0_4px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_25px_-5px_rgba(153,192,255,0.4)]
        cursor-pointer select-none
        transition-all duration-300 ease-out
        hover:-translate-y-1 active:translate-y-0 active:scale-95
        focus:outline-none focus:ring-4 focus:ring-blue-50
      "
    >
      {/* Hover Gradient Bloom */}
      <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />

      {/* Text */}
      <span className="relative z-10 text-xs font-black text-slate-500 group-hover:text-[#1e3a8a] uppercase tracking-[0.2em] transition-colors duration-300">
        {displayText}
      </span>
    </div>
  );
}

export default EntryBox;
