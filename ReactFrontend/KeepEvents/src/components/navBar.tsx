import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import LogoutButton from "./Logout";
import { Menu, X } from "lucide-react";

function NavBar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { to: "/HomePage", label: "Home" },
    { to: "/Events", label: "Events" },
    { to: "/Photos", label: "Photos" },
    { to: "/Activity", label: "Activity" },
  ];

  return (
    <header className="sticky top-0 z-[50] w-full transition-all duration-300">
      
      {/* Top Branding Bar (Dark Green Glass) */}
      <div className="bg-[#283618]/95 backdrop-blur-md text-[#fefae0] text-[10px] font-black uppercase tracking-[0.4em] px-6 lg:px-25 py-2.5 text-center sm:text-left border-b border-white/10 relative z-20">
        Archive Management System
      </div>

      {/* Main Navbar (White Glass) */}
      <nav className="flex items-center justify-between h-16 px-6 lg:px-25 relative z-10 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all">
        
        {/* Left: Branding */}
        <div
          className="text-[#283618] font-black text-xl lg:text-2xl tracking-tighter cursor-pointer uppercase z-20 drop-shadow-sm select-none"
          onClick={() => {
            navigate("/HomePage");
            setIsMenuOpen(false);
          }}
        >
          Keep<span className="text-[#bc6c25]">Events</span>
        </div>

        {/* Mobile Toggle Button */}
        <button 
          className="lg:hidden z-[60] text-[#283618] p-2 hover:bg-[#bc6c25]/10 rounded-full transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Center: Desktop Navigation Links */}
        <ul className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center h-full space-x-2">
          {navLinks.map((link) => (
            <li key={link.to} className="h-full flex items-center">
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `px-6 py-2 rounded-full flex items-center text-[13px] font-black uppercase tracking-widest transition-all duration-300 ${
                    isActive
                      ? "text-[#bc6c25] bg-white/80 shadow-sm ring-1 ring-[#bc6c25]/20"
                      : "text-[#606c38] hover:text-[#283618] hover:bg-white/40"
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right: Actions & Identity (Desktop) */}
        <div className="hidden lg:flex items-center space-x-6">
          <NavLink
            to="/Profile"
            className={({ isActive }) =>
              `flex flex-col items-end transition-all ${
                isActive ? "text-[#bc6c25]" : "text-[#606c38] hover:text-[#283618]"
              }`
            }
          >
            <span className="text-sm font-black uppercase tracking-tight">
              My Profile
            </span>
          </NavLink>
          {/* Vertical Divider */}
          <div className="h-8 w-[1px] bg-[#283618]/10"></div>
          <LogoutButton onLoggedOut={() => navigate("/")} />
        </div>

        {/* Mobile Menu Backdrop */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-[#283618]/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Mobile Side Drawer */}
        <div className={`
          fixed top-0 right-0 h-full z-50 
          bg-white/85 backdrop-blur-2xl 
          border-l border-white/50 shadow-2xl 
          transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] lg:hidden
          ${isMenuOpen ? "translate-x-0 w-3/4 max-w-[300px]" : "translate-x-full w-3/4 max-w-[300px]"}
        `}>
          <div className="flex flex-col h-full pt-24 px-6 space-y-2">
            <span className="text-[10px] font-black text-[#bc6c25] uppercase tracking-[0.3em] mb-4 px-4 opacity-80">Navigation</span>
            
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `text-sm font-black uppercase tracking-widest p-4 rounded-xl transition-all ${
                    isActive 
                      ? "bg-[#bc6c25]/10 text-[#bc6c25] shadow-inner" 
                      : "text-[#283618] hover:bg-white/50"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            
            <div className="border-t border-[#283618]/10 pt-6 mt-4">
              <NavLink
                to="/Profile"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `text-sm font-black uppercase tracking-widest p-4 block rounded-xl transition-all ${
                    isActive ? "bg-[#bc6c25]/10 text-[#bc6c25]" : "text-[#606c38] hover:bg-white/50"
                  }`
                }
              >
                My Profile
              </NavLink>
              <div className="mt-4 px-4">
                <LogoutButton onLoggedOut={() => {
                  navigate("/");
                  setIsMenuOpen(false);
                }} />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default NavBar;  