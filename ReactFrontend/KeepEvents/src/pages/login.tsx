import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import {toast} from "react-hot-toast"

function Login() {
  const navigate = useNavigate();
  const [userEmail, setuserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const data = await login(userEmail, password);
      navigate("/HomePage");
      toast.success("Login successful");
    } catch (err) {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white font-sans overflow-hidden p-4">
      
      {/* --- Background Aesthetics --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.1) rotate(10deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(-10deg); }
        }
        @keyframes shine {
          100% { left: 125%; }
        }
        .animate-float-slow { animation: float 20s infinite ease-in-out; }
        .animate-float-medium { animation: float 15s infinite ease-in-out -5s; }
        .animate-float-fast { animation: float 12s infinite ease-in-out -10s; }
        .animate-shine { animation: shine 2s infinite; }
        
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>
      
      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

      {/* Colorful Watercolor Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-slow pointer-events-none" style={{ backgroundColor: '#ff9999' }} /> {/* Pink */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-medium pointer-events-none" style={{ backgroundColor: '#aaff99' }} /> {/* Green */}
      <div className="absolute top-[20%] left-[10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-float-fast pointer-events-none" style={{ backgroundColor: '#99c0ff' }} /> {/* Blue */}


      <div className="relative w-full max-w-[26rem] z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
            KEEP<span className="text-[#0062ff]">EVENTS</span>
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">
            Your Memories, Organized.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/70 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] border border-white/80 w-full relative overflow-hidden"
        >
          {/* Decorative Top Border Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff9999] via-[#aaff99] to-[#99c0ff]"></div>

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Login</h2>
            {/* Animated decorative dot */}
            <div className="w-3 h-3 bg-[#ffcc99] rounded-full animate-pulse"></div>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-[#fff0f0] text-[#ff3333] p-4 rounded-2xl mb-6 border border-red-100 animate-in slide-in-from-top-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="relative group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input
                type="text"
                placeholder="name@example.com"
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#0062ff] focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-slate-700 font-medium placeholder-slate-300"
                value={userEmail}
                onChange={(e) => setuserEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#ff9999] focus:ring-4 focus:ring-red-500/10 transition-all duration-300 text-slate-700 font-medium placeholder-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.953 9.953 0 011.659-5.197m12.206 14.022A9.953 9.953 0 0022 9c0-5.523-4.477-10-10-10a9.953 9.953 0 00-5.197 1.659M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 mb-8">
            <button type="button" className="text-xs font-bold text-[#0062ff] hover:text-[#ff9999] transition-colors uppercase tracking-wide" onClick={() => navigate('/forgot-password')}>
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="group relative w-full bg-[#0062ff] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 overflow-hidden hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              Sign In
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            {/* Shine Effect */}
            <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 group-hover:animate-shine" />
          </button>

          <p className="text-center mt-8 text-slate-400 text-xs font-medium">
            Don't have an account?{" "}
            <button type="button" onClick={() => navigate('/register')} className="font-bold text-[#0062ff] hover:text-[#ff9999] transition-colors">
              Register now
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
