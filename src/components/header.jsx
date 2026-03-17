import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { account } from "../backend/appwrite";
import { LogOut } from "lucide-react";
import logo from "../assets/logo.png";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error.message);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 flex items-center h-14 ${scrolled
        ? "bg-teal-700/95 backdrop-blur-md shadow-md"
        : "bg-teal-700"
        }`}
    >
      <nav className="flex items-center justify-between px-4 md:px-6 max-w-7xl mx-auto w-full">
        <Link
          to="/"
          className="flex items-center gap-2 group transition-transform active:scale-95 no-underline"
          style={{ textDecoration: 'none' }}
        >
          <div className="w-8 h-8 overflow-hidden rounded-lg bg-white flex items-center justify-center p-1">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tighter text-white uppercase italic">
            Classist
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 transition-all active:scale-95 shadow-sm"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </nav>
    </header>
  );
}