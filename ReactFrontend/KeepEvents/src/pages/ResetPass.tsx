import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resendOTP, verifyOTP, resetPassword } from "../services/auth";
import { toast } from "react-hot-toast";

function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<"EMAIL" | "OTP" | "PASSWORD">("EMAIL");
  const [error, setError] = useState("");

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await resendOTP(email);
      setStep("OTP");
      toast.success("OTP sent to your email");
    } catch {
      setError("Failed to send OTP");
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await verifyOTP(email, otp);
      setStep("PASSWORD");
      toast.success("OTP verified");
    } catch {
      setError("Invalid OTP");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await resetPassword(email, password);
      toast.success("Password reset successful");
      navigate("/HomePage");
    } catch {
      setError("Failed to reset password");
    }
  }

  return (
  <div className="relative min-h-screen w-full flex items-center justify-center bg-white font-sans overflow-hidden">
    
    {/* --- Custom Keyframes & Pattern --- */}
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(50px, -70px) scale(1.15); }
        66% { transform: translate(-30px, 40px) scale(0.95); }
      }
      @keyframes shine {
        100% { left: 125%; }
      }
      .animate-float-1 { animation: float 18s infinite ease-in-out; }
      .animate-float-2 { animation: float 22s infinite ease-in-out -4s; }
      .animate-float-3 { animation: float 26s infinite ease-in-out -8s; }
      .animate-shine { animation: shine 2s infinite; }
      
      .bg-dot-pattern {
        background-image: radial-gradient(#f1f5f9 2px, transparent 2px);
        background-size: 34px 34px;
      }
    `}</style>

    {/* --- Google Photos Aesthetic Background --- */}
    <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

    {/* Large, Overlapping Colorful Blobs */}
    <div 
      className="absolute top-[-10%] right-[-5%] w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-1"
      style={{ backgroundColor: '#ff9999' }} // --color-powder-blush-200
    />
    <div 
      className="absolute bottom-[-15%] left-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-2"
      style={{ backgroundColor: '#99c0ff' }} // --color-baby-blue-ice-200
    />
    <div 
      className="absolute top-[20%] left-[5%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-25 animate-float-3"
      style={{ backgroundColor: '#aaff99' }} // --color-tea-green-200
    />

    {/* --- Reset Password Card --- */}
    <div className="relative z-10 w-full max-w-md px-6">
      <form
        onSubmit={
          step === "EMAIL"
            ? handleSendOTP
            : step === "OTP"
            ? handleVerifyOTP
            : handleResetPassword
        }
        className="bg-white/40 backdrop-blur-3xl p-10 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-white/80 transition-all duration-500"
      >
        <div className="mb-12 text-center">
          {/* Animated Header Icon */}
          <div 
            className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-xl shadow-blue-500/5 text-[#0062ff]"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">
            Reset Password
          </h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {step === "EMAIL" && "Enter your email to receive a code"}
            {step === "OTP" && "Check your inbox for the 6-digit code"}
            {step === "PASSWORD" && "Set your new secure password"}
          </p>
        </div>

        {error && (
          <div 
            className="mb-8 p-4 border-l-4 text-xs font-bold rounded-r-2xl animate-pulse"
            style={{ backgroundColor: '#ffe5e5', borderColor: '#ff3333', color: '#660000' }}
          >
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* EMAIL */}
          {step === "EMAIL" && (
            <div className="group">
              <input
                type="email"
                placeholder="email@example.com"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.8rem] outline-none transition-all font-medium placeholder:text-slate-300 shadow-sm group-hover:shadow-md"
                
                // Ring highlight: --color-baby-blue-ice-200
                onFocus={(e) => e.target.style.borderColor = '#0062ff'}
                onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {/* OTP */}
          {step === "OTP" && (
            <input
              type="text"
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-8 text-center text-5xl font-black tracking-[0.4em] bg-white border-2 border-slate-50 rounded-[2.5rem] outline-none transition-all shadow-inner"
              style={{ color: '#002766', borderColor: '#99f7ff' }} 
              // Color: Baby-blue-ice-800, Border: Electric-aqua-200
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
              required
            />
          )}

          {/* PASSWORD */}
          {step === "PASSWORD" && (
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.8rem] outline-none transition-all font-medium group-hover:shadow-md"
                onFocus={(e) => e.target.style.borderColor = '#2bff00'} 
                // Ring highlight: --color-tea-green-500
                onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-5 text-[10px] font-black tracking-widest text-slate-400 hover:text-slate-900 uppercase"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="group relative w-full mt-10 text-white font-bold py-5 rounded-[2rem] transition-all duration-500 shadow-xl overflow-hidden active:scale-95"
          style={{ 
            backgroundColor: '#0062ff',
            boxShadow: '0 20px 40px -10px rgba(0, 98, 255, 0.3)' 
          }}
        >
          <span className="relative z-10 tracking-tight text-lg">
            {step === "EMAIL" && "Send Reset Code"}
            {step === "OTP" && "Verify & Continue"}
            {step === "PASSWORD" && "Reset Password"}
          </span>
          <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 group-hover:animate-shine" />
        </button>

        {step === "OTP" && (
          <button
            type="button"
            onClick={() => resendOTP(email)}
            className="w-full mt-6 text-[11px] font-black tracking-[0.2em] transition-colors uppercase"
            style={{ color: '#ff8c00' }} // --color-apricot-cream-500
          >
            Resend Code
          </button>
        )}

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            RETURN TO SIGN IN
          </button>
        </div>
      </form>
    </div>
  </div>
);
}

export default ResetPassword;
