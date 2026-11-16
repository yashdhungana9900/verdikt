import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Outlet, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import CommandPalette from "@/components/CommandPalette";
import AuthDialog from "@/components/AuthDialog";
import { refreshMe } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import Landing from "@/pages/Landing";
import Problems from "@/pages/Problems";
import NotFound from "@/pages/NotFound";

// Heavy pages load on demand to keep the first paint fast.
const ProblemPage = lazy(() => import("@/pages/ProblemPage"));
const Contest = lazy(() => import("@/pages/Contest"));
const Profile = lazy(() => import("@/pages/Profile"));

const PageSkeleton = () => (
  <div className="mx-auto max-w-[1040px] space-y-4 px-5 pt-12">
    <Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80" /><Skeleton className="h-64 w-full rounded-xl" />
  </div>
);

const Footer = () => (
  <footer className="border-t border-line px-5 py-8 text-center text-sm text-fg3">
    <span className="text-fg2">Verdikt</span> · Write code. Get a verdict. ·{" "}
    <Link to="/contest" className="transition hover:text-fg">Contests</Link>
  </footer>
);

function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { refreshMe(); }, []);
  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <Navbar onSearch={() => setOpen(true)} />
      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <AuthDialog />
      <motion.main key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </motion.main>
      {!pathname.startsWith("/problems/") && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="problems" element={<Problems />} />
        <Route path="problems/:id" element={<ProblemPage />} />
        <Route path="contest" element={<Contest />} />
        <Route path="me" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
