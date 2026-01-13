import { useEffect, useState } from "react";
import { useParams , useNavigate } from "react-router-dom";
import { acceptEventInvite } from "../services/events";
import { getMe } from "../services/auth";
import type { User } from "../types/user";
import { toast } from "react-hot-toast";


function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  // ----------------------------
  // Check login status
  // ----------------------------
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me.user);
      } catch {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ----------------------------
  // Accept invite
  // ----------------------------
  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      await acceptEventInvite(token);
      setAccepted(true);
      toast.success("Invite accepted!");
    } catch (e: any) {
      toast.error(e.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
      navigate("/HomePage"); // nav
    }
  };

  // ----------------------------
  // Decline invite (frontend only)
  // ----------------------------
  const handleDecline = () => {

    setDeclined(true);
    toast.error("Invite declined!");
    navigate("/HomePage");
  };

  // ----------------------------
  // RENDER
  // ----------------------------
 // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#aaff99] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Checking Invite...</p>
        </div>
      </div>
    );
  }

  // 2. Invalid Token State
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-[#ff9999] rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-pulse" />
        
        <div className="bg-[#fff0f0] p-10 rounded-[2.5rem] border border-red-100 shadow-xl text-center relative z-10 max-w-sm mx-4">
           <div className="w-16 h-16 bg-red-100 text-[#ff3333] rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           </div>
           <h3 className="text-[#ff3333] font-black text-xl tracking-tight mb-2">Invalid Invite</h3>
           <p className="text-slate-500 font-medium text-sm">This link may have expired or is incorrect.</p>
        </div>
      </div>
    );
  }

  // 3. Main Invite UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-sans relative overflow-hidden px-4">
      
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
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-1 pointer-events-none" style={{ backgroundColor: '#aaff99' }} /> {/* Green */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-float-2 pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}


      <div className="bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white p-10 w-full max-w-md relative overflow-hidden z-10">
        
        {/* Top Gradient Decoration */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#aaff99] via-[#99c0ff] to-[#ff9999]"></div>

        {/* Main UI */}
        {!accepted && !declined && (
          <>
            <div className="text-center mb-8">
               <span className="text-[#99c0ff] font-black text-[10px] uppercase tracking-[0.3em] mb-2 block">
                 You're Invited
               </span>
               <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
                Event Invitation
              </h2>
            </div>

            {/* Not logged in */}
            {!currentUser && (
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                  <p className="text-slate-500 text-sm font-medium">
                    Please log in or register to accept this invite.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => navigate("/login")}
                    className="flex-1 px-4 py-4 bg-[#99c0ff] text-[#1e3a8a] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#77aaff] transition-all shadow-lg shadow-blue-100 hover:-translate-y-1"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="flex-1 px-4 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all hover:-translate-y-1"
                  >
                    Register
                  </button>
                </div>
              </div>
            )}

            {/* Logged in */}
            {currentUser && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="text-center">
                  <div className="inline-block bg-[#f0fdf4] px-6 py-2 rounded-full border border-green-100">
                    <p className="text-slate-600 text-sm font-bold">
                      Logged in as <span className="text-[#16a34a] font-black">{currentUser.username}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleDecline}
                    className="flex-1 px-4 py-4 bg-white border border-slate-200 text-[#ff3333] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#fff0f0] hover:border-red-100 transition-all disabled:opacity-50"
                    disabled={accepting}
                  >
                    Decline
                  </button>

                  <button
                    onClick={handleAccept}
                    className="flex-1 px-4 py-4 bg-[#aaff99] text-[#14532d] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#88ee77] transition-all shadow-lg shadow-green-100 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
                    disabled={accepting}
                  >
                    {accepting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-[#14532d] border-t-transparent rounded-full animate-spin"></span>
                        Processing
                      </span>
                    ) : "Accept Invite"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Success / Declined Messages (If you want to render something after action) */}
        {accepted && (
           <div className="text-center py-8 animate-in zoom-in">
              <div className="w-16 h-16 bg-[#aaff99] text-[#14532d] rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-800">You're in!</h3>
              <p className="text-slate-500 font-medium mt-2">Redirecting to event...</p>
           </div>
        )}

        {declined && (
           <div className="text-center py-8 animate-in zoom-in">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-800">Invite Declined</h3>
           </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-[#fff0f0] rounded-xl border border-red-100 text-center animate-in fade-in">
             <p className="text-[#ff3333] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
               <span>⚠️</span> {error}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
