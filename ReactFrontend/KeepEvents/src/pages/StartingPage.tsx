import { useNavigate } from "react-router-dom";
import EntryBox from "../components/EntryBox";
import "../styles/loginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  return (
  <div className="relative min-h-screen w-full flex items-center justify-center bg-white font-sans overflow-hidden">
    
    {/* --- CSS Animations & Patterns --- */}
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(60px, -80px) scale(1.2); }
        66% { transform: translate(-40px, 40px) scale(0.9); }
      }
      @keyframes shine {
        100% { left: 125%; }
      }
      .animate-float-1 { animation: float 20s infinite ease-in-out; }
      .animate-float-2 { animation: float 25s infinite ease-in-out -5s; }
      .animate-float-3 { animation: float 30s infinite ease-in-out -10s; }
      .animate-shine { animation: shine 2s infinite; }
      
      .bg-dot-pattern {
        background-image: radial-gradient(#e2e8f0 1.5px, transparent 1.5px);
        background-size: 36px 36px;
      }
    `}</style>

    {/* --- Background Layer --- */}
    <div className="absolute inset-0 bg-dot-pattern opacity-40 z-0 pointer-events-none" />

    {/* Google Photos Style Blobs (Using your palette) */}
    {/* Powder Blush */}
    <div 
      className="absolute top-[-10%] left-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float-1"
      style={{ backgroundColor: '#ff9999' }} 
    />
    {/* Electric Aqua */}
    <div 
      className="absolute bottom-[-15%] right-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-float-2"
      style={{ backgroundColor: '#99f7ff' }} 
    />
    {/* Apricot Cream */}
    <div 
      className="absolute top-[20%] right-[5%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-25 animate-float-3"
      style={{ backgroundColor: '#ffd199' }} 
    />
    {/* Tea Green */}
    <div 
      className="absolute bottom-[10%] left-[10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-1"
      style={{ backgroundColor: '#aaff99' }} 
    />

    {/* --- Main Content Card --- */}
    <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row rounded-[3.5rem] overflow-hidden m-6 bg-white/60 border border-white/80 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] backdrop-blur-3xl">
      
      {/* LEFT: Branding Section */}
      <div className="w-full md:w-1/2 p-12 lg:p-20 flex flex-col justify-center">
        <div className="mb-10 inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-white shadow-xl shadow-blue-500/10 text-blue-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-6xl lg:text-7xl font-black tracking-tighter mb-8 leading-[0.85] text-slate-900">
          Keep<br />
          <span className="text-[#0062ff]">Events.</span>
        </h1>
        
        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-sm">
          Preserving the atmosphere of your <span className="text-slate-900 underline decoration-blue-200 decoration-4 underline-offset-4">most precious</span> gatherings.
        </p>
      </div>

      {/* RIGHT: Action Section */}
      <div className="w-full md:w-1/2 p-12 lg:p-20 flex flex-col justify-center bg-white/30">
        <h2 className="text-xs uppercase tracking-[0.3em] font-black text-slate-400 mb-10">
          Account Access
        </h2>
        
        <div className="space-y-4">
          {/* LOGIN BUTTON */}
          <button
            onClick={() => navigate("/login")}
            className="group relative flex items-center justify-between w-full p-6 bg-[#0062ff] text-white rounded-[1.8rem] transition-all duration-500 shadow-[0_20px_40px_-10px_rgba(0,98,255,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(0,98,255,0.5)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-start text-left">
              <span className="text-xl font-bold tracking-tight">Login</span>
              <span className="text-xs opacity-70">Enter your portal</span>
            </div>
            <div className="relative z-10 bg-white/20 p-3 rounded-full group-hover:translate-x-1 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 group-hover:animate-shine" />
          </button>

          {/* REGISTER BUTTON */}
          <button
            onClick={() => navigate("/register")}
            className="group flex items-center justify-between w-full p-6 bg-white border border-slate-100 text-slate-900 rounded-[1.8rem] transition-all duration-300 hover:border-blue-200 hover:shadow-lg active:scale-95"
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-xl font-bold tracking-tight">Register</span>
              <span className="text-xs text-slate-400">Join our community</span>
            </div>
            <div className="p-3 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
        </div>

        {/* Community Proof */}
        <div className="mt-16 pt-10 border-t border-slate-100 flex items-center gap-5">
          <div className="flex -space-x-3">
            {[
              { color: '#ff9999', label: 'R' },
              { color: '#99c0ff', label: 'B' },
              { color: '#aaff99', label: 'G' }
            ].map((user, i) => (
              <div 
                key={i} 
                className="w-10 h-10 rounded-full border-4 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.label}
              </div>
            ))}
          </div>
          <div>
            <p className="text-slate-900 text-sm font-bold leading-none">500+ members</p>
            <p className="text-slate-400 text-[11px] font-medium tracking-wide mt-1">TRUSTED BY ORGANIZERS</p>
          </div>
        </div>
      </div>

    </div>
  </div>
);
}

export default LoginPage;
