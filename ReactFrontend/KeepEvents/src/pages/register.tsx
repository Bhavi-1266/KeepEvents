import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register, resendOTP, verifyOTP } from "../services/auth";
import {toast} from "react-hot-toast"

function Register() {
  const navigate = useNavigate();
  const [userEmail, setuserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [takeOTP, setTakeOTP] = useState(false);
  const [otp, setOTP] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    register(userEmail, password, name)
      .then((data) => {
        if (!data.hasOwnProperty("userid")) {
          console.log("in user id not found");
          if (data.is_active === "False") { // "as error is returning only in string , not in bool"
            console.log("in user id not found --- otp sending");
            resendOTP(userEmail)
              .then(() => {
                setTakeOTP(true);
              })
              .catch((err) => {
                console.log(err);
                setError("OTP send failed try again later.");
              });
          } else {
            console.log("in user id not found --- otp not sending");
            if (data.username) {
              setError(data.username[0]);
            } else if (data.email) {
              setError(data.email[0]);
            } else {
              setError("Registration failed try again later.");
            }
          }
        } else {
          console.log("IN userid found");

          if (data.is_active === false) { // here false not a string as working 
            console.log("IN userid found --- otp sending");
            resendOTP(userEmail)
              .then(() => {
                setTakeOTP(true);
              })
              .catch((err) => {
                console.log(err);
                setError("OTP resend failed try again later.");
              });
          } else {
            throw new Error("Registration failed try again later.");
          }
        }
      })
      .catch((err) => {
        console.log(err);
        setError("Invalid credentials");
      });
  }

  async function handleSubmitOTP(e: React.FormEvent) {
    e.preventDefault();

    verifyOTP(userEmail, otp)
      .then((data) => {
        navigate("/HomePage");
        toast.success("Registration successful");
      })
      .catch((err) => {
        console.log(err);
        setError("Invalid credentials");
      });
  }

  return (
  <div className="relative min-h-screen w-full flex items-center justify-center bg-white font-sans overflow-hidden">
    
    {/* --- CSS Animations --- */}
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(50px, -70px) scale(1.1); }
        66% { transform: translate(-30px, 40px) scale(0.9); }
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

    {/* --- Background Elements --- */}
    <div className="absolute inset-0 bg-dot-pattern opacity-60 z-0 pointer-events-none" />

    <div 
      className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-1"
      style={{ backgroundColor: '#ff9999' }} 
    />
    <div 
      className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-30 animate-float-2"
      style={{ backgroundColor: '#99f7ff' }} 
    />
    <div 
      className="absolute top-[20%] left-[10%] w-[30rem] h-[30rem] rounded-full mix-blend-multiply filter blur-[110px] opacity-25 animate-float-3"
      style={{ backgroundColor: '#aaff99' }} 
    />

    {/* --- Main Card --- */}
    <div className="relative z-10 w-full max-w-md px-6">
      
      <div className="flex justify-center mb-8">
        <div className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-500/10 border border-slate-50 text-[#0062ff]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
      </div>

      <form
        onSubmit={takeOTP ? handleSubmitOTP : handleSubmit}
        className="bg-white/40 backdrop-blur-3xl p-10 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-white/80 transition-all duration-500"
      >
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">
            {takeOTP ? "Verify" : "Register"}
          </h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            {takeOTP ? "We've sent a code to your inbox." : "Start your journey with KeepEvents."}
          </p>
        </div>

        {error && (
          <div 
            className="mb-8 p-4 border-l-4 text-xs font-bold rounded-r-2xl flex items-center gap-3 animate-pulse"
            style={{ backgroundColor: '#ffe5e5', borderColor: '#ff3333', color: '#660000' }}
          >
            <span>⚠️</span>
            <p className="uppercase tracking-tight">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Email field */}
          <div className={`transition-all duration-500 ${takeOTP ? "opacity-40 scale-95" : ""}`}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
              Official Email
            </label>
            <input
              type="text"
              placeholder="name@example.com"
              className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium"
              onFocus={(e) => {
                e.target.style.borderColor = '#0062ff';
                e.target.style.boxShadow = '0 0 0 4px rgba(0, 98, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f1f5f9';
                e.target.style.boxShadow = 'none';
              }}
              value={userEmail}
              onChange={(e) => setuserEmail(e.target.value)}
              disabled={takeOTP}
            />
          </div>

          {!takeOTP && (
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  User Name
                </label>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#22cc00';
                    e.target.style.boxShadow = '0 0 0 4px rgba(34, 204, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#f1f5f9';
                    e.target.style.boxShadow = 'none';
                  }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                   Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-medium"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ff8c00';
                    e.target.style.boxShadow = '0 0 0 4px rgba(255, 140, 0, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#f1f5f9';
                    e.target.style.boxShadow = 'none';
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div
                  className="absolute right-5 bottom-4 text-slate-300 hover:text-slate-600 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.953 9.953 0 011.659-5.197m12.206 14.022A9.953 9.953 0 0022 9c0-5.523-4.477-10-10-10a9.953 9.953 0 00-5.197 1.659M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </div>
              </div>
            </div>
          )}

          {takeOTP && (
            <div className="py-2">
              <label className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
                6-Digit Secure Code
              </label>
              <input
                type="text"
                placeholder="000000"
                className="w-full px-4 py-6 border-2 rounded-[2.5rem] bg-white outline-none text-center text-4xl font-black tracking-[0.4em] text-[#001433] shadow-inner"
                style={{ borderColor: '#99f7ff' }}
                value={otp}
                onChange={(e) => setOTP(e.target.value)}
                maxLength={6}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="group relative w-full mt-10 text-white font-bold py-5 rounded-[2rem] transition-all duration-500 shadow-xl overflow-hidden active:scale-95 flex items-center justify-center gap-3"
          style={{ 
            backgroundColor: '#0062ff',
            boxShadow: '0 20px 40px -10px rgba(0, 98, 255, 0.3)' 
          }}
        >
          <span className="relative z-10 tracking-tight text-lg">
            {takeOTP ? "Verify Code" : "Create Account"}
          </span>
          <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/20 group-hover:animate-shine" />
        </button>

        {takeOTP ? (
          <button
            type="button"
            onClick={() => resendOTP(userEmail)}
            className="w-full mt-8 text-[11px] font-black tracking-[0.2em] transition-colors uppercase"
            style={{ color: '#ff8c00' }}
          >
            Resend Verification Code
          </button>
        ) : (
          <div className="mt-10 text-center">
            <p className="text-xs font-bold text-slate-400">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate('/login')} className="text-[#0062ff] hover:underline ml-1">
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