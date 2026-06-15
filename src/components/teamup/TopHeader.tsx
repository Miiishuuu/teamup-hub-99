import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/teamup-api";
import { Avatar } from "./Avatar";

export function TopHeader() {
  const { user } = useAuth();
  const { data: me } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md border-b border-navy-dark/5">
      <div className="mx-auto max-w-xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-lg tracking-tight text-navy-dark">
          TeamUp
        </Link>
        <div className="text-xs font-mono uppercase tracking-widest text-navy-light">
          {pathname === "/" && "Feed"}
          {pathname === "/search" && "Search"}
          {pathname === "/notifications" && "Activity"}
          {pathname === "/create" && "Create"}
          {pathname.startsWith("/profile") && "Profile"}
        </div>
        <Link to="/profile" aria-label="Profile">
          <Avatar name={me?.full_name || "U"} photoUrl={me?.photo_url} size={36} rounded="full" />
        </Link>
      </div>
    </header>
  );
}
