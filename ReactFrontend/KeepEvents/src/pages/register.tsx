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
    <div className="min-h-screen flex items-center justify-center bg-[#fefae0] p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#606c38] rounded-full filter blur-[80px] opacity-20 -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#bc6c25] rounded-full filter blur-[100px] opacity-10 -ml-20 -mb-20"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Mini-Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#283618] p-3 rounded-2xl shadow-xl">
            <svg className="w-8 h-8 text-[#dda15e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        </div>

        <form
          onSubmit={takeOTP ? handleSubmitOTP : handleSubmit}
          className="bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(40,54,24,0.15)] border border-[#dda15e]/30 transition-all duration-500"
        >
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black text-[#283618] tracking-tighter mb-2">
              {takeOTP ? "VERIFY" : "REGISTER"}
            </h2>
            <p className="text-[#606c38] text-sm font-medium">
              {takeOTP
                ? "We've sent a woodland pigeon with a code."
                : "Start your journey with KeepEvents."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3 animate-bounce-short">
              <span className="text-red-600 text-lg">⚠️</span>
              <p className="text-red-700 text-xs font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Email field (Shared) */}
            <div className={`${takeOTP ? "opacity-60" : ""}`}>
              <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-[0.2em] mb-1.5 ml-1">
                Official Email
              </label>
              <input
                type="text"
                placeholder="nature@example.com"
                className="w-full px-5 py-3.5 bg-[#fefae0]/30 border-2 border-[#dda15e]/20 rounded-2xl focus:border-[#bc6c25] focus:bg-white transition-all outline-none text-[#283618] font-medium placeholder-[#606c38]/30"
                value={userEmail}
                onChange={(e) => setuserEmail(e.target.value)}
                disabled={takeOTP}
              />
            </div>

            {!takeOTP && (
              <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-[0.2em] mb-1.5 ml-1">
                    User Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full px-5 py-3.5 bg-[#fefae0]/30 border-2 border-[#dda15e]/20 rounded-2xl focus:border-[#bc6c25] focus:bg-white transition-all outline-none text-[#283618] font-medium placeholder-[#606c38]/30"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#606c38] uppercase tracking-[0.2em] mb-1.5 ml-1">
                     Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 bg-[#fefae0]/30 border-2 border-[#dda15e]/20 rounded-2xl focus:border-[#bc6c25] focus:bg-white transition-all outline-none text-[#283618] font-medium placeholder-[#606c38]/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div
                    className=" top-1/2 right-4  text-[#606c38] cursor-pointer"
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
            )}

            {takeOTP && (
              <div className="py-2 animate-in zoom-in duration-300">
                <label className="block text-center text-[10px] font-black text-[#606c38] uppercase tracking-[0.2em] mb-4">
                  6-Digit Secure Code
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  className="w-full px-4 py-5 border-2 border-[#bc6c25] rounded-3xl bg-white focus:ring-4 focus:ring-[#bc6c25]/10 transition-all outline-none text-center text-3xl font-black tracking-[0.5em] text-[#283618] placeholder-[#bc6c25]/10"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-8 bg-[#283618] hover:bg-[#606c38] text-[#fefae0] font-bold py-4 rounded-2xl transition-all shadow-xl shadow-[#283618]/20 active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            <span>{takeOTP ? "VERIFY NOW" : "JOIN THE COMMUNITY"}</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          {takeOTP ? (
            <button
              type="button"
              onClick={() => {
                resendOTP(userEmail)
                  .then(() => {
                    setError("");
                    // Use a toast or custom notification instead of window.alert if possible
                    console.log("OTP Resent");
                  })
                  .catch(() => setError("Failed to resend OTP"));
              }}
              className="w-full mt-4 text-xs font-black text-[#bc6c25] hover:text-[#283618] uppercase tracking-widest transition-colors"
            >
              Didn't receive it? Resend Code
            </button>
          ) : (
            <p className="mt-6 text-center text-xs font-bold text-[#606c38]">
              Already part of the herd?{" "}
              <button type="button" onClick={() => navigate('/login')} className="text-[#bc6c25] hover:underline">
                Sign In
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Register;