import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/lib/teamup-api";
import { PostCard, FollowButton } from "@/components/teamup/PostCard";
import { Avatar, roleLabel, SkillChips } from "@/components/teamup/Avatar";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({ component: SearchPage });

function SearchPage() {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["search", q], queryFn: () => searchAll(q), enabled: q.trim().length > 0 });
  return (
    <div className="space-y-4">
      <div className="bg-paper rounded-xl border border-navy-dark/5 p-2 flex items-center gap-2">
        <SearchIcon className="size-4 text-navy-light ml-2" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, posts, skills…" className="flex-1 bg-transparent outline-none text-sm py-2 text-navy-dark placeholder:text-navy-light/60" />
      </div>
      {data?.people?.length ? (
        <section>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-navy-light mb-2 px-1">People</h3>
          <div className="space-y-2">
            {data.people.map((u) => (
              <Link key={u.id} to="/profile/$userId" params={{ userId: u.id }} className="bg-paper rounded-xl border border-navy-dark/5 p-3 flex items-center gap-3">
                <Avatar name={u.full_name} photoUrl={u.photo_url} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold font-display text-navy-dark truncate">{u.full_name || "Unnamed"}</p>
                  <p className="text-[11px] font-mono uppercase text-navy-light">{roleLabel(u.role)}</p>
                  {u.skills?.length > 0 && <div className="mt-1.5"><SkillChips skills={u.skills.slice(0, 3)} /></div>}
                </div>
                <FollowButton targetId={u.id} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {data?.posts?.length ? (
        <section>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-navy-light mb-2 px-1">Posts</h3>
          <div className="space-y-4">{data.posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      ) : null}
      {q && !data?.people?.length && !data?.posts?.length && <p className="text-sm text-navy-light text-center py-8">No matches.</p>}
    </div>
  );
}
