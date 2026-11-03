import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Menu, Users, X } from "lucide-react";
import Monogram from "../components/Monogram";
import { useAuth } from "./AuthContext";
import { ToastProvider } from "./ui";

const nav = [
  { to: "/admin/guests", label: "Guest List", icon: Users },
  { to: "/admin/codes", label: "Access Codes", icon: KeyRound },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-sm font-sans text-sm transition-colors border-l-2 ${
      isActive ? "bg-white/10 text-ivory border-gold" : "text-ivory/65 border-transparent hover:text-ivory hover:bg-white/5"
    }`;

  const sidebar = (
    <div className="flex h-full flex-col bg-deep-plum text-ivory">
      <div className="flex items-center gap-3 px-6 py-7 border-b border-white/10">
        <Monogram className="w-9 h-9 text-gold" />
        <div>
          <p className="font-serif text-lg leading-tight">Adetutu &amp; Victor</p>
          <p className="font-sans text-[10px] tracking-[0.25em] text-gold">ADMIN</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1" aria-label="Admin">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={link}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-5 border-t border-white/10">
        <p className="font-sans text-xs text-ivory/50 truncate mb-3" title={admin?.email}>{admin?.email}</p>
        <button
          onClick={async () => { await logout(); navigate("/admin/login"); }}
          className="flex items-center gap-2 font-sans text-sm text-ivory/70 hover:text-ivory"
        >
          <LogOut size={16} />Sign out
        </button>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ivory lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-64">{sidebar}</aside>

        {/* Mobile top bar + drawer */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-deep-plum text-ivory px-4 py-3">
          <div className="flex items-center gap-2">
            <Monogram className="w-7 h-7 text-gold" />
            <span className="font-serif">Admin</span>
          </div>
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1"><Menu size={22} /></button>
        </div>
        {open && (
          <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
            <div className="w-64 max-w-[80%] relative">
              {sidebar}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-5 right-4 text-ivory/70"><X size={20} /></button>
            </div>
            <button className="flex-1 bg-deep-plum/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          </div>
        )}

        <main className="px-4 sm:px-8 py-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
