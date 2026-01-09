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
    <div className="min-h-screen flex items-center justify-center bg-[#fefae0] p-4 relative overflow-hidden">
      {/* Decorative organic shape in background */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#dda15e] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#606c38] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[#283618] tracking-tighter">
            KEEP<span className="text-[#bc6c25]">EVENTS</span>
          </h1>
          <p className="text-[#606c38] font-medium italic">Welcome back to the forest.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-[#dda15e]/30 w-full"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#283618]">Login</h2>
            <div className="h-1 w-12 bg-[#bc6c25] rounded-full"></div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl mb-6 border border-red-100 animate-shake">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="relative group">
              <label className="block text-xs font-bold text-[#606c38] uppercase tracking-widest mb-1 ml-1">Email Address</label>
              <input
                type="text"
                placeholder="name@example.com"
                className="w-full p-4 bg-[#fefae0]/50 border-2 border-[#dda15e]/20 rounded-2xl outline-none focus:border-[#bc6c25] focus:bg-white transition-all duration-300 text-[#283618] placeholder-[#606c38]/40"
                value={userEmail}
                onChange={(e) => setuserEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-[#606c38] uppercase tracking-widest mb-1 ml-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full p-4 bg-[#fefae0]/50 border-2 border-[#dda15e]/20 rounded-2xl outline-none focus:border-[#bc6c25] focus:bg-white transition-all duration-300 text-[#283618] placeholder-[#606c38]/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div
                className="absolute top-1/2 right-4  text-[#606c38] cursor-pointer"
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

          <div className="flex justify-end mt-3 mb-8">
            <button type="button" className="text-sm font-bold text-[#bc6c25] hover:text-[#283618] transition-colors">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-[#283618] hover:bg-[#606c38] text-[#fefae0] py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#283618]/20 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            <span>Sign In</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <p className="text-center mt-8 text-[#606c38] text-sm">
            Don't have an account?{" "}
            <button type="button" onClick={() => navigate('/register')} className="font-bold text-[#bc6c25] hover:underline">
              Register now
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
