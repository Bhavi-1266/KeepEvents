import { useNavigate } from "react-router-dom";
import EntryBox from "../components/EntryBox";
import "../styles/loginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  return (
  <div className="min-h-screen flex items-center justify-center bg-[#fefae0] font-sans overflow-hidden">
    {/* Decorative Background Pattern */}
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#283618 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

    <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row shadow-2xl rounded-[2rem] overflow-hidden m-4 bg-[#283618]">
      
      {/* Branding Section */}
      <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-[#283618] text-[#fefae0]">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#606c38] text-[#dda15e] shadow-lg">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4 leading-none">
          KEEP<br />
          <span className="text-[#dda15e]">EVENTS</span>
        </h1>
        <p className="text-lg text-[#fefae0]/80 max-w-xs border-l-4 border-[#bc6c25] pl-4 italic">
          Preserving the atmosphere of your most precious gatherings.
        </p>
      </div>

      {/* Action Section */}
      <div className="w-full md:w-1/2 bg-[#fefae0] p-12 flex flex-col justify-center">
        <h2 className="text-[#283618] text-2xl font-bold mb-8">Get Started</h2>
        
        <div className="flex flex-col gap-5">
          <button
            onClick={() => navigate("/login")}
            className="group relative flex items-center justify-between w-full p-5 bg-[#606c38] hover:bg-[#283618] text-[#fefae0] rounded-2xl transition-all duration-300 shadow-xl hover:shadow-[#606c38]/30 overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-start">
              <span className="text-xs uppercase tracking-widest opacity-70">Already a member?</span>
              <span className="text-xl font-bold">Login</span>
            </div>
            <svg className="relative z-10 w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            {/* Hover visual effect */}
            <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/10 group-hover:animate-shine" />
          </button>

          <button
            onClick={() => navigate("/register")}
            className="group flex items-center justify-between w-full p-5 border-2 border-[#bc6c25] text-[#bc6c25] hover:bg-[#bc6c25] hover:text-[#fefae0] rounded-2xl transition-all duration-300 font-bold active:scale-95"
          >
            <div className="flex flex-col items-start">
              <span className="text-xs uppercase tracking-widest opacity-70">New around here?</span>
              <span className="text-xl font-bold">Register</span>
            </div>
            <div className="p-2 rounded-lg bg-[#bc6c25]/10 group-hover:bg-[#fefae0]/20 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
        </div>

        <div className="mt-12 flex items-center gap-4">
          <div className="flex -space-x-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#fefae0] bg-[#dda15e] flex items-center justify-center text-[10px] font-bold text-[#283618]`}>
                U{i}
              </div>
            ))}
          </div>
          <p className="text-[#606c38] text-xs font-medium">Joined by 500+ event lovers</p>
        </div>
      </div>

    </div>
  </div>
);
}

export default LoginPage;
