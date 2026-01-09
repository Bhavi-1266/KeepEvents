import { NavLink, useNavigate } from "react-router-dom";
import LogoutButton from "./Logout";

function NavBar() {
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-yellow-300 border-b-2 border-yellow-300 pb-1"
      : "text-white hover:text-blue-200 transition";

  return (
  <header className="w-full sticky top-0 z-[12] border-b border-[#dda15e]/20">
    {/* Top Branding Bar */}
    <div className="bg-[#283618] text-[#fefae0] text-[10px] font-black uppercase tracking-[0.4em] px-25 py-2.5">
      Archive Management System
    </div>

    {/* Main Navbar - Increased height to h-20 */}
    <nav className="flex items-center justify-between h-15 bg-white px-25 shadow-sm relative text-xl">
      
      {/* Left: Branding */}
      <div
        className="text-[#283618] font-black text-2xl tracking-tighter cursor-pointer uppercase z-10"
        onClick={() => navigate("/HomePage")}
      >
        Keep<span className="text-[#bc6c25]">Events</span>
      </div>

      {/* Center: Navigation Links - Now perfectly centered with full-height highlight */}
      <ul className="absolute left-1/2 -translate-x-1/2 flex items-center h-full  space-x-6 z-0">
        {[
          { to: "/HomePage", label: "Home" },
          { to: "/Events", label: "Events" },
          { to: "/Photos", label: "Photos" },
          { to: "/Activity", label: "Activity" }, // Swapped to center
        ].map((link) => (
          <li key={link.to} className="h-full">
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `px-6 h-full flex items-center text-[14px] font-black uppercase tracking-widest transition-all relative ${
                  isActive
                    ? "text-[#bc6c25] bg-[#fefae0]/60 "
                    : "text-[#606c38] hover:text-[#283618] hover:bg-gray-50 "
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {/* Bottom bar indicator for extra sharpness */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#bc6c25]" />
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Right: Actions & Identity */}
      <div className="flex items-center space-x-6 z-10">
        <NavLink
          to="/Profile"
          className={({ isActive }) =>
            `flex flex-col items-end transition-all ${
              isActive ? "text-[#bc6c25]" : "text-[#606c38] hover:text-[#283618]"
            }`
          }
        >
          <span className="text-sm font-black uppercase tracking-tight -mt-1">
            My Profile
          </span>
        </NavLink>

        <div className="h-8 w-[1px] bg-gray-200"></div>

        <LogoutButton onLoggedOut={() => navigate("/login")} />
      </div>
    </nav>
  </header>
);
}

export default NavBar;
