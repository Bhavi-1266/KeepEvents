import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, resendOTP, verifyOTP } from "../services/auth";
import { toast } from "react-hot-toast";

// --- Interfaces for Type Safety ---
interface RegisterResponse {
  userid?: string;
  is_active?: boolean | string;
  email?: string[];
  username?: string[];
  password?: string[];
  detail?: string;
  [key: string]: any;
}

function Register() {
  const navigate = useNavigate();

  // --- Form State ---
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    otp: "",
  });

  // --- UI State ---
  const [view, setView] = useState<"register" | "verify">("register");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // --- Handlers ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); // Clear error when user types
  };

  // Helper to process backend errors
  const extractErrorMessage = (data: RegisterResponse) => {
    if (data.username) return data.username[0];
    if (data.email) return data.email[0];
    if (data.password) return data.password[0];
    if (data.detail) return data.detail;
    return "Registration failed. Please check your details.";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const data: RegisterResponse = await register(
        formData.email,
        formData.password,
        formData.name
      );

      // --- Scenario A: Registration Successful ---
      if (data.userid) {
        // If user is created but inactive (standard flow based on your backend)
        if (data.is_active === false || data.is_active === "False") {
          await triggerOtpSend();
        } else {
          // Edge case: User created and immediately active
          toast.success("Account created! Please log in.");
          navigate("/login");
        }
      } 
      // --- Scenario B: Registration Failed (e.g. User Exists) ---
      else {
        // Check if the error implies an inactive existing account
        // Note: This relies on your backend sending specific data on 400. 
        // If not, we fall back to showing the error.
        if (data.is_active === "False" || data.is_active === false) {
          toast("Account exists but is unverified.", { icon: "⚠️" });
          await triggerOtpSend();
        } else {
          setError(extractErrorMessage(data));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Separated OTP sending logic for reusability
  const triggerOtpSend = async () => {
    try {
      // Use toast.promise for better UX
      await toast.promise(resendOTP(formData.email), {
        loading: 'Sending Verification Code...',
        success: 'Code sent to your email!',
        error: 'Failed to send OTP.'
      });
      setView("verify");
    } catch (err) {
      console.error(err);
      setError("Could not send OTP.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await verifyOTP(formData.email, formData.otp);
      toast.success("Welcome! Registration successful.");
      navigate("/HomePage");
    } catch (err: any) {
      console.error(err);
      setError("Invalid Code. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white font-sans overflow-hidden">
      
      {/* --- Animations & Background (Kept from your original) --- */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.1); }
          66% { transform: translate(-30px, 40px) scale(0.9); }
        }
        @keyframes shine {
          100% { left: 125%; }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .animate-spin-custom { animation: spin 1s linear infinite; }
        .animate-float-1 { animation: float 18s infinite ease-in-out; }
        .animate-float-2 { animation: float 22s infinite ease-in-out -4s; }
        .animate-float-3 { animation: float 26s infinite ease-in-out -8s; }
        .animate-shine { animation: shine 2s infinite; }
        .bg-dot-pattern {
          background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
          background-size: 34px 34px;
        }
      `}</style>

      <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-1" style={{ backgroundColor: '#ff9999' }} />
      <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-2" style={{ backgroundColor: '#99f7ff' }} />
      <div className="absolute top-[20%] left-[10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-25 animate-float-3" style={{ backgroundColor: '#aaff99' }} />

      {/* --- Main Card --- */}
      <div className="relative z-10 w-full max-w-md px-6">
        
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-500/10 border border-slate-50 text-[#0062ff]">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        <form
          onSubmit={view === "verify" ? handleVerify : handleRegister}
          className="bg-white/40 backdrop-blur-3xl p-10 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-white/80 transition-all duration-500"
        >
          {/* Header */}
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">
              {view === "verify" ? "Verify" : "Register"}
            </h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              {view === "verify" 
                ? `Enter the code sent to ${formData.email}` 
                : "Start your journey with KeepEvents."}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-8 p-4 border-l-4 text-xs font-bold rounded-r-2xl flex items-center gap-3 animate-pulse bg-red-50 border-red-500 text-red-800">
              <span>⚠️</span>
              <p className="uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            
            {/* Email Field - Always visible but disabled in verify mode */}
            <div className={`transition-all duration-500 ${view === "verify" ? "opacity-60" : ""}`}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                Official Email
              </label>
              <input
                type="email"
                name="email"
                required
                disabled={view === "verify" || isLoading}
                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Register Fields */}
            {view === "register" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    User Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                    placeholder="Your Full Name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-5 bottom-4 text-slate-300 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.953 9.953 0 011.659-5.197m12.206 14.022A9.953 9.953 0 0022 9c0-5.523-4.477-10-10-10a9.953 9.953 0 00-5.197 1.659M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* OTP Field */}
            {view === "verify" && (
              <div className="py-2 animate-in zoom-in duration-300">
                <label className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                  6-Digit Secure Code
                </label>
                <input
                  type="text"
                  name="otp"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  placeholder="000000"
                  className="w-full px-4 py-6 border-2 border-cyan-200 rounded-[2.5rem] bg-white outline-none text-center text-4xl font-black tracking-[0.4em] text-[#001433] shadow-inner focus:border-cyan-400 transition-colors"
                  value={formData.otp}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full mt-10 text-white font-bold py-5 rounded-[2rem] transition-all duration-500 shadow-xl overflow-hidden flex items-center justify-center gap-3
              ${isLoading ? 'opacity-80 cursor-not-allowed' : 'active:scale-95 hover:shadow-2xl shadow-blue-500/30'}`}
            style={{ backgroundColor: '#0062ff' }}
          >
            {isLoading ? (
               <svg className="animate-spin-custom h-6 w-6 text-white" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
               </svg>
            ) : (
              <>
                <span className="relative z-10 tracking-tight text-lg">
                  {view === "verify" ? "Verify Code" : "Create Account"}
                </span>
                <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
            <div className={`absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 ${!isLoading && 'group-hover:animate-shine'}`} />
          </button>

          {/* Footer Actions */}
          {view === "verify" ? (
            <button
              type="button"
              onClick={triggerOtpSend}
              disabled={isLoading}
              className="w-full mt-8 text-[11px] font-black tracking-[0.2em] transition-colors uppercase hover:text-orange-600 disabled:opacity-50"
              style={{ color: '#ff8c00' }}
            >
              Resend Verification Code
            </button>
          ) : (
            <div className="mt-10 text-center">
              <p className="text-xs font-bold text-slate-400">
                Already have an account?{" "}
                <button 
                  type="button" 
                  onClick={() => navigate('/login')} 
                  className="text-[#0062ff] hover:underline ml-1"
                >
                  Sign In
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Register;