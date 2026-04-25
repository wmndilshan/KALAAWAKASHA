import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

type LayoutProps = {
  children: React.ReactNode;
};

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/add", label: "Add" },
  { to: "/search", label: "Search" },
  { to: "/check", label: "Check" },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-4 rounded-xxl bg-ink p-4 text-mist shadow-panel">
        <h1 className="font-['Sora'] text-2xl">KalaAwakasha Tickets</h1>
      </header>

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                location.pathname === item.to ? "bg-ink text-white" : "text-ink/70"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full border-t border-black/5 py-2 text-sm font-semibold text-ember"
        >
          Sign out
        </button>
      </nav>
    </div>
  );
}
