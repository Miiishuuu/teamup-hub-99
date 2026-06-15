import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50">
      <div className="bg-navy-dark/95 backdrop-blur-xl rounded-2xl p-2.5 flex items-center justify-between shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-1 flex-1 justify-around">
          <DockItem to="/" icon={Home} label="Home" active={pathname === "/"} />
          <DockItem to="/search" icon={Search} label="Search" active={pathname === "/search"} />
        </div>
        <Link
          to="/create"
          aria-label="Create"
          className={cn(
            "mx-2 size-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform",
            pathname === "/create" ? "bg-white text-navy-dark" : "bg-navy-light text-white",
          )}
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </Link>
        <div className="flex items-center gap-1 flex-1 justify-around">
          <DockItem to="/notifications" icon={Bell} label="Activity" active={pathname === "/notifications"} />
          <DockItem to="/profile" icon={User} label="Profile" active={pathname.startsWith("/profile")} />
        </div>
      </div>
    </nav>
  );
}

function DockItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: "/" | "/search" | "/notifications" | "/profile";
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "size-10 rounded-xl grid place-items-center transition-all",
        active ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
    </Link>
  );
}
