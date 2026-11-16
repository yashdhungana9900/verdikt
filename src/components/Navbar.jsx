import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Moon, Search, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleTheme, useTheme } from "@/lib/theme";
import { logout, openAuth, useAuth } from "@/lib/auth";

const NavItem = ({ to, children }) => (
  <NavLink to={to} className={({ isActive }) => cn("relative rounded-lg px-3 py-1.5 text-sm transition-colors", isActive ? "text-fg" : "text-fg2 hover:text-fg")}>
    {({ isActive }) => (
      <>
        {isActive && <motion.span layoutId="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-lg bg-panel2" />}
        <span className="relative">{children}</span>
      </>
    )}
  </NavLink>
);

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  useEffect(() => {
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg2 transition hover:bg-panel2 hover:text-fg";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="flex h-9 items-center gap-2 rounded-lg px-1.5 transition hover:bg-panel2 sm:pr-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-accent2 to-accent text-xs font-semibold text-white">{user.username[0].toUpperCase()}</span>
        <span className="hidden text-sm sm:block">{user.username}</span>
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-line2 bg-panel p-1.5 shadow-[0_20px_50px_rgb(0_0_0/.4)]">
          <div className="px-3 py-2 text-xs text-fg3">{user.email}</div>
          <button className={item} onClick={() => { setOpen(false); nav("/me"); }}><User size={15} />Your profile</button>
          <button className={item} onClick={() => { setOpen(false); logout(); nav("/"); }}><LogOut size={15} />Log out</button>
        </motion.div>
      )}
    </div>
  );
}

export default function Navbar({ onSearch }) {
  const theme = useTheme();
  const { user, loading } = useAuth();
  return (
    <nav className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-5">
      <Link to="/" className="mr-3 flex items-center gap-2.5 font-semibold">
        <span className="grid size-[22px] place-items-center rounded-[7px] bg-gradient-to-br from-accent2 to-accent text-xs text-white shadow-[0_0_18px_rgb(124_92_255/.5)]">V</span>
        Verdikt
      </Link>
      <NavItem to="/problems">Problems</NavItem>
      <NavItem to="/contest">Contest</NavItem>
      <span className="flex-1" />
      <button onClick={onSearch} aria-label="Search" className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-panel px-2.5 text-sm text-fg3 transition hover:border-line2 hover:text-fg2 md:flex">
        <Search size={14} /> Search
        <kbd className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <button onClick={onSearch} aria-label="Search" className="grid size-9 place-items-center rounded-lg text-fg2 transition hover:bg-panel2 hover:text-fg md:hidden"><Search size={16} /></button>
      <button onClick={toggleTheme} aria-label="Toggle theme" className="grid size-9 place-items-center rounded-lg text-fg2 transition hover:bg-panel2 hover:text-fg">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      {!loading && (user ? <UserMenu user={user} /> : (
        <div className="ml-1 flex items-center gap-1.5">
          <Button variant="ghost" onClick={() => openAuth("login")}>Log in</Button>
          <Button variant="primary" onClick={() => openAuth("signup")} className="hidden sm:inline-flex">Sign up</Button>
        </div>
      ))}
    </nav>
  );
}
