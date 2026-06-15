import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/teamup-api";
import { useAuth } from "@/hooks/useAuth";
import { PostCard } from "@/components/teamup/PostCard";

export const Route = createFileRoute("/_authenticated/")({
  component: FeedPage,
});

function FeedPage() {
  const { user } = useAuth();
  const { data: posts, isLoading } = useQuery({ queryKey: ["feed", user?.id], queryFn: () => fetchFeed(user!.id), enabled: !!user });
  return (
    <div className="space-y-4">
      <div className="animate-entrance bg-paper p-4 rounded-xl border border-navy-dark/5 shadow-sm">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-navy-light mb-1">Welcome to TeamUp</h2>
        <p className="text-sm font-medium text-navy-dark">Share a project, join a hackathon, find your team.</p>
      </div>
      {isLoading && <p className="text-sm text-navy-light text-center py-8">Loading…</p>}
      {!isLoading && posts?.length === 0 && <p className="text-sm text-navy-light text-center py-8">No posts yet. Tap + to create the first one.</p>}
      {posts?.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}
