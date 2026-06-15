import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile, fetchFollowCounts, fetchUserPosts, fetchInterestedPosts, fetchSavedPosts } from "@/lib/teamup-api";
import { Avatar, roleLabel, SkillChips } from "./Avatar";
import { PostCard, FollowButton } from "./PostCard";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LogOut, Pencil, Linkedin } from "lucide-react";
import { toast } from "sonner";

export function ProfileView({ userId, isOwn }: { userId: string; isOwn: boolean }) {
  const { signOut, user: me } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"posts" | "interested" | "saved">("posts");
  const [editing, setEditing] = useState(false);
  const { data: profile } = useQuery({ queryKey: ["profile", userId], queryFn: () => fetchProfile(userId) });
  const { data: counts } = useQuery({ queryKey: ["follow-counts", userId], queryFn: () => fetchFollowCounts(userId) });
  const { data: posts } = useQuery({ queryKey: ["user-posts", userId, me?.id], queryFn: () => fetchUserPosts(userId, me!.id), enabled: !!me && tab === "posts" });
  const { data: interested } = useQuery({ queryKey: ["interested-posts", userId], queryFn: () => fetchInterestedPosts(userId), enabled: isOwn && tab === "interested" });
  const { data: saved } = useQuery({ queryKey: ["saved-posts", userId], queryFn: () => fetchSavedPosts(userId), enabled: isOwn && tab === "saved" });

  if (!profile) return <p className="text-sm text-navy-light py-8 text-center">Loading…</p>;

  return (
    <div className="space-y-4">
      <section className="bg-paper rounded-2xl border border-navy-dark/5 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <Avatar name={profile.full_name} photoUrl={profile.photo_url} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold font-display text-navy-dark truncate">{profile.full_name || "Unnamed"}</h1>
            <p className="text-[11px] font-mono uppercase text-navy-light">{roleLabel(profile.role)}</p>
            {profile.linkedin && <a href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-[11px] text-navy-light font-mono"><Linkedin className="size-3" /> LinkedIn</a>}
          </div>
          {isOwn ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="size-9 grid place-items-center rounded-lg bg-navy-dark/5 text-navy-dark" aria-label="Edit profile"><Pencil className="size-4" /></button>
              <button onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }} className="size-9 grid place-items-center rounded-lg bg-navy-dark/5 text-navy-dark" aria-label="Sign out"><LogOut className="size-4" /></button>
            </div>
          ) : <FollowButton targetId={profile.id} />}
        </div>
        {profile.bio && <p className="text-sm text-navy-mid mt-3 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>}
        {profile.skills?.length > 0 && <div className="mt-3"><SkillChips skills={profile.skills} /></div>}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-navy-dark/5 pt-4">
          <Stat label="Posts" value={posts?.length} />
          <Stat label="Followers" value={counts?.followers} />
          <Stat label="Following" value={counts?.following} />
        </div>
      </section>
      {editing && isOwn && <EditProfileForm profile={profile} onClose={() => setEditing(false)} />}
      <div className="flex gap-1 bg-paper rounded-xl border border-navy-dark/5 p-1">
        <Tab active={tab === "posts"} onClick={() => setTab("posts")} label="Posts" />
        {isOwn && <Tab active={tab === "interested"} onClick={() => setTab("interested")} label="Interested" />}
        {isOwn && <Tab active={tab === "saved"} onClick={() => setTab("saved")} label="Saved" />}
      </div>
      <div className="space-y-4">
        {tab === "posts" && (posts?.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <Empty text="No posts yet." />)}
        {tab === "interested" && (interested?.length ? interested.map((p) => <PostCard key={p.id} post={p} />) : <Empty text="Nothing interested." />)}
        {tab === "saved" && (saved?.length ? saved.map((p) => <PostCard key={p.id} post={p} />) : <Empty text="No saved posts." />)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (<div><p className="text-lg font-bold font-display text-navy-dark">{value ?? 0}</p><p className="text-[10px] font-mono uppercase tracking-widest text-navy-light">{label}</p></div>);
}
function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} className={cn("flex-1 py-2 text-xs font-bold font-display rounded-lg transition-colors", active ? "bg-navy-dark text-white" : "text-navy-mid hover:bg-navy-dark/5")}>{label}</button>);
}
function Empty({ text }: { text: string }) { return <p className="text-sm text-navy-light text-center py-8">{text}</p>; }

function EditProfileForm({ profile, onClose }: { profile: { id: string; full_name: string; bio: string; skills: string[]; linkedin: string }; onClose: () => void }) {
  const [bio, setBio] = useState(profile.bio);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [linkedin, setLinkedin] = useState(profile.linkedin);
  const [name, setName] = useState(profile.full_name);
  const [saving, setSaving] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ full_name: name, bio, skills: skills.split(",").map((s) => s.trim()).filter(Boolean), linkedin }).eq("id", profile.id);
      setSaving(false);
      if (error) toast.error(error.message); else { toast.success("Profile updated"); onClose(); }
    }} className="bg-paper rounded-2xl border border-navy-dark/5 p-4 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="profile-input" />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="profile-input resize-none" />
      <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma-separated)" className="profile-input" />
      <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="LinkedIn URL" className="profile-input" />
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-navy-dark/5 text-navy-dark text-xs font-bold">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-navy-dark text-white text-xs font-bold">{saving ? "Saving…" : "Save"}</button>
      </div>
      <style>{`.profile-input{width:100%;background:#fcfcfd;border:1px solid rgba(15,27,61,0.1);border-radius:0.75rem;padding:0.6rem 0.9rem;font-size:0.875rem;color:#0f1b3d;outline:none}.profile-input:focus{border-color:#3b6fa0}`}</style>
    </form>
  );
}
