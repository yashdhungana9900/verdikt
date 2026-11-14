import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Moon, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme, useTheme } from "@/lib/theme";

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

export default function Navbar({ onSearch }) {
  const theme = useTheme();
  return (
    <nav className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-5">
      <Link to="/" className="mr-3 flex items-center gap-2.5 font-semibold">
        <span className="grid size-[22px] place-items-center rounded-[7px] bg-gradient-to-br from-accent2 to-accent text-xs text-white shadow-[0_0_18px_rgb(124_92_255/.5)]">V</span>
        Verdikt
      </Link>
      <NavItem to="/problems">Problems</NavItem>
      <NavItem to="/contest">Contest</NavItem>
      <span className="flex-1" />
      <button onClick={onSearch} aria-label="Search" className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-panel px-2.5 text-sm text-fg3 transition hover:border-line2 hover:text-fg2 sm:flex">
        <Search size={14} /> Search
        <kbd className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <button onClick={onSearch} aria-label="Search" className="grid size-9 place-items-center rounded-lg text-fg2 transition hover:bg-panel2 hover:text-fg sm:hidden"><Search size={16} /></button>
      <button onClick={toggleTheme} aria-label="Toggle theme" className="grid size-9 place-items-center rounded-lg text-fg2 transition hover:bg-panel2 hover:text-fg">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </nav>
  );
}
