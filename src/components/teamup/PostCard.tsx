import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar, SkillChips, roleLabel } from "./Avatar";
import { Bookmark, Calendar, MapPin, Sparkles, Users, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInterestedUsers, fetchTeamUpRequest, type Post, type Profile } from "@/lib/teamup-api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isHackathon = post.type === "hackathon";
  const isOwn = user?.id === post.user_id;
  const [showInterested, setShowInterested] = useState(false);

  const toggleInterest = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (post.is_interested) {
        await supabase.from("post_interests").delete().eq("user_id", user.id).eq("post_id", post.id);
        return { undone: true };
      } else {
        const { error } = await supabase.from("post_interests").insert({ user_id: user.id, post_id: post.id });
        if (error) throw error;
        if (!isOwn) {
          const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
          const msg = isHackathon
            ? `${me?.full_name ?? "Someone"} is interested in participating in your hackathon.`
            : `${me?.full_name ?? "Someone"} is interested in your project.`;
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            actor_id: user.id,
            type: isHackathon ? "interest_hackathon" : "interest_project",
            message: msg,
            post_id: post.id,
          });
        }
        return { undone: false };
      }
    },
    onSuccess: (res) => { qc.invalidateQueries(); toast.success(res?.undone ? "Removed interest" : "Marked as interested"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (post.is_saved) {
        await supabase.from("post_saves").delete().eq("user_id", user.id).eq("post_id", post.id);
        return { undone: true };
      } else {
        const { error } = await supabase.from("post_saves").insert({ user_id: user.id, post_id: post.id });
        if (error) throw error;
        return { undone: false };
      }
    },
    onSuccess: (res) => { qc.invalidateQueries(); toast.success(res?.undone ? "Unsaved" : "Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      if (!confirm("Delete this post? This cannot be undone.")) return { cancelled: true } as const;
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
      return { cancelled: false } as const;
    },
    onSuccess: (res) => { if (res?.cancelled) return; qc.invalidateQueries(); toast.success("Post deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="animate-entrance bg-paper rounded-2xl border border-navy-dark/5 shadow-sm overflow-hidden">
      <div className={cn("p-5", isHackathon && "bg-navy-dark text-white")}>
        <div className="flex justify-between items-start gap-3">
          <Link to="/profile/$userId" params={{ userId: post.user_id }} className="flex gap-3 min-w-0">
            <Avatar name={post.author?.full_name || "?"} photoUrl={post.author?.photo_url} size={40} />
            <div className="min-w-0">
              <h3 className={cn("text-sm font-bold font-display leading-none truncate", isHackathon && "text-white")}>
                {post.author?.full_name || "Unknown"}
              </h3>
              <p className={cn("text-[11px] mt-1 font-mono uppercase", isHackathon ? "text-white/60" : "text-navy-light")}>
                {roleLabel(post.author?.role || "user")} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </Link>
          <span className={cn("shrink-0 px-2 py-1 text-[10px] font-mono rounded tracking-tighter uppercase", isHackathon ? "bg-white/20 text-white" : "bg-navy-dark text-white")}>
            {post.type}
          </span>
        </div>
        {isHackathon && (
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">When</p>
              <p className="text-xs font-mono font-medium flex items-center gap-1"><Calendar className="size-3" />{post.event_date ?? "TBA"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Venue</p>
              <p className="text-xs font-mono font-medium flex items-center gap-1 truncate"><MapPin className="size-3 shrink-0" /><span className="truncate">{post.venue ?? "TBA"}</span></p>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <h4 className="text-lg font-bold font-display mb-2 text-balance leading-tight text-navy-dark">{post.title}</h4>
        <p className="text-sm text-navy-mid/85 leading-relaxed mb-4 text-pretty whitespace-pre-wrap">{post.description}</p>
        <SkillChips skills={post.skills || []} />
        {isHackathon && post.registration_link && (
          <a href={/^https?:\/\//i.test(post.registration_link) ? post.registration_link : '#'} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-xs font-bold text-navy-light underline underline-offset-4">Registration link →</a>
        )}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-navy-dark/5">
          <div className="flex items-center gap-2 text-xs text-navy-light font-mono"><Users className="size-3.5" />{post.interested_count ?? 0} interested</div>
          <button onClick={() => setShowInterested((v) => !v)} className="text-[11px] font-bold text-navy-mid underline underline-offset-4 decoration-navy-light/30">
            {showInterested ? "Hide" : "View"} Interested List
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => toggleInterest.mutate()} disabled={toggleInterest.isPending} className={cn("flex-1 py-2.5 rounded-lg text-xs font-bold font-display transition-colors flex items-center justify-center gap-1.5", post.is_interested ? "bg-success-soft text-success border border-success/20" : "bg-navy-dark/5 text-navy-dark border border-navy-dark/10 hover:bg-navy-dark/10")}>
            {post.is_interested ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {post.is_interested ? "Interested" : "I'm Interested"}
          </button>
          <button onClick={() => toggleSave.mutate()} disabled={toggleSave.isPending} className={cn("px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5", post.is_saved ? "bg-navy-dark text-white" : "bg-navy-dark/5 text-navy-dark hover:bg-navy-dark/10")} aria-label="Save">
            <Bookmark className="size-3.5" fill={post.is_saved ? "currentColor" : "none"} />
            {post.is_saved ? "Saved" : "Save"}
          </button>
        </div>
        {!isHackathon && !isOwn && (
          <TeamUpButton recipientId={post.user_id} recipientProfile={post.author} postId={post.id} isHackathon={false} className="mt-2" />
        )}
        {showInterested && <InterestedList postId={post.id} />}
        {isOwn && (
          <button onClick={() => deletePost.mutate()} disabled={deletePost.isPending} className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold font-display text-danger bg-danger/5 border border-danger/15 hover:bg-danger/10 flex items-center justify-center gap-1.5">
            <Trash2 className="size-3.5" /> Delete post
          </button>
        )}
      </div>
    </article>
  );
}

function InterestedList({ postId }: { postId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["interested-users", postId], queryFn: () => fetchInterestedUsers(postId) });
  if (isLoading) return <p className="mt-4 text-xs text-navy-light">Loading…</p>;
  if (!data?.length) return <p className="mt-4 text-xs text-navy-light">No one yet — be the first.</p>;
  return (
    <div className="mt-4 space-y-2 animate-fadein">
      {data.map((u) => <InterestedUserCard key={u.id} user={u} postId={postId} />)}
    </div>
  );
}

function InterestedUserCard({ user, postId }: { user: Profile; postId: string }) {
  const { user: me } = useAuth();
  if (me?.id === user.id) return null;
  return (
    <div className="bg-surface-wash/60 rounded-xl p-3 border border-navy-dark/5">
      <div className="flex items-center gap-3">
        <Link to="/profile/$userId" params={{ userId: user.id }} className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={user.full_name} photoUrl={user.photo_url} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold font-display text-navy-dark truncate hover:underline">{user.full_name}</p>
            <p className="text-[11px] font-mono uppercase text-navy-light">{roleLabel(user.role)}</p>
            {user.skills?.length > 0 && <div className="mt-1.5"><SkillChips skills={user.skills.slice(0, 4)} /></div>}
          </div>
        </Link>
        <FollowButton targetId={user.id} />
      </div>
      <div className="mt-2"><TeamUpButton recipientId={user.id} recipientProfile={user} postId={postId} isHackathon /></div>
    </div>
  );
}

export function FollowButton({ targetId }: { targetId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: isFollowing } = useQuery({
    queryKey: ["follow", user?.id, targetId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle();
      return !!data;
    },
    enabled: !!user && user.id !== targetId,
  });
  const m = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
        const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        await supabase.from("notifications").insert({ user_id: targetId, actor_id: user.id, type: "follow", message: `${me?.full_name ?? "Someone"} started following you.` });
      }
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!user || user.id === targetId) return null;
  return (
    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); m.mutate(); }} disabled={m.isPending} className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold font-display transition-colors shrink-0", isFollowing ? "bg-navy-dark/5 text-navy-dark border border-navy-dark/10" : "bg-navy-dark text-white")}>
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}

export function TeamUpButton({ recipientId, recipientProfile, postId, isHackathon, className }: { recipientId: string; recipientProfile?: Profile; postId: string | null; isHackathon: boolean; className?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["teamup", user?.id, recipientId, postId ?? "null"];
  const { data: existing } = useQuery({ queryKey: key, queryFn: () => fetchTeamUpRequest(user!.id, recipientId, postId), enabled: !!user && user.id !== recipientId });
  const { data: contact } = useQuery({
    queryKey: ["unlocked-contact", recipientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unlocked_contact", { target: recipientId });
      if (error) throw error;
      return (data as Array<{ email: string; phone: string }>)?.[0] ?? null;
    },
    enabled: !!user && user.id !== recipientId && !!existing,
  });
  const m = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (existing) {
        await supabase.from("team_up_requests").delete().eq("id", existing.id);
      } else {
        const { error } = await supabase.from("team_up_requests").insert({ requester_id: user.id, recipient_id: recipientId, post_id: postId });
        if (error) throw error;
        const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        const msg = isHackathon ? `${me?.full_name ?? "Someone"} wants to team up with you for this hackathon.` : `${me?.full_name ?? "Someone"} wants to team up with you.`;
        await supabase.from("notifications").insert({ user_id: recipientId, actor_id: user.id, type: isHackathon ? "team_up_hackathon" : "team_up", message: msg, post_id: postId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });
  if (!user || user.id === recipientId) return null;
  return (
    <div className={className}>
      <button onClick={() => m.mutate()} disabled={m.isPending} className={cn("w-full py-2.5 rounded-lg text-xs font-bold font-display transition-colors flex items-center justify-center gap-1.5", existing ? "bg-success-soft text-success border border-success/30" : "bg-navy-dark text-white hover:bg-navy-mid")}>
        {existing ? <Check className="size-3.5" /> : null}
        {existing ? "Request Sent" : "Team Up"}
      </button>
      {existing && recipientProfile && (
        <div className="mt-2 bg-navy-dark/5 rounded-lg p-3 border border-navy-dark/10 animate-fadein">
          <p className="text-[10px] font-bold tracking-widest text-navy-light uppercase mb-2">Contact unlocked</p>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between gap-2"><span className="text-navy-light uppercase text-[10px]">Email</span><span className="text-navy-dark truncate">{contact?.email || "—"}</span></div>
            <div className="flex items-center justify-between gap-2"><span className="text-navy-light uppercase text-[10px]">LinkedIn</span><span className="text-navy-dark truncate">{recipientProfile.linkedin || "—"}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
