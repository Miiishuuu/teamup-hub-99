import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "user" | "organizer" | "institution" | "organization";
  bio: string;
  skills: string[];
  linkedin: string;
  photo_url: string;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  type: "project" | "hackathon";
  title: string;
  description: string;
  skills: string[];
  venue: string | null;
  event_date: string | null;
  registration_link: string | null;
  created_at: string;
  author?: Profile;
  interested_count?: number;
  is_interested?: boolean;
  is_saved?: boolean;
};

export async function fetchFeed(currentUserId: string): Promise<Post[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_user_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return enrichPosts(posts ?? [], currentUserId);
}

export async function fetchUserPosts(userId: string, currentUserId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_user_id_fkey(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return enrichPosts(data ?? [], currentUserId);
}

export async function fetchInterestedPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("post_interests")
    .select("post:posts(*, author:profiles!posts_user_id_fkey(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const posts = ((data ?? []) as Array<{ post: Post | null }>).map((r) => r.post).filter(Boolean) as Post[];
  return enrichPosts(posts, userId);
}

export async function fetchSavedPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("post_saves")
    .select("post:posts(*, author:profiles!posts_user_id_fkey(*))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const posts = ((data ?? []) as Array<{ post: Post | null }>).map((r) => r.post).filter(Boolean) as Post[];
  return enrichPosts(posts, userId);
}

async function enrichPosts(posts: Post[], currentUserId: string): Promise<Post[]> {
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const [{ data: interests }, { data: saves }] = await Promise.all([
    supabase.from("post_interests").select("post_id, user_id").in("post_id", ids),
    supabase.from("post_saves").select("post_id").in("post_id", ids).eq("user_id", currentUserId),
  ]);
  const interestMap = new Map<string, { count: number; mine: boolean }>();
  for (const id of ids) interestMap.set(id, { count: 0, mine: false });
  for (const row of interests ?? []) {
    const entry = interestMap.get(row.post_id)!;
    entry.count += 1;
    if (row.user_id === currentUserId) entry.mine = true;
  }
  const savedSet = new Set((saves ?? []).map((s) => s.post_id));
  return posts.map((p) => ({
    ...p,
    interested_count: interestMap.get(p.id)?.count ?? 0,
    is_interested: interestMap.get(p.id)?.mine ?? false,
    is_saved: savedSet.has(p.id),
  }));
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchFollowCounts(userId: string) {
  const { data, error } = await supabase.rpc("get_follow_counts", { target: userId });
  if (error) throw error;
  const row = (data as Array<{ followers: number; following: number }>)?.[0];
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) };
}

export async function fetchIsFollowing(currentUserId: string, targetId: string): Promise<boolean> {
  if (currentUserId === targetId) return false;
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function fetchInterestedUsers(postId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("post_interests")
    .select("user:profiles!post_interests_user_id_fkey(*)")
    .eq("post_id", postId);
  if (error) throw error;
  return ((data ?? []) as Array<{ user: Profile | null }>).map((r) => r.user).filter(Boolean) as Profile[];
}

export async function fetchTeamUpRequest(requesterId: string, recipientId: string, postId: string | null) {
  let q = supabase
    .from("team_up_requests")
    .select("id, post_id")
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId);
  if (postId === null) q = q.is("post_id", null);
  else q = q.eq("post_id", postId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(full_name, photo_url, role)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function searchAll(query: string) {
  const q = query.trim();
  if (!q) return { people: [], posts: [] as Post[] };
  const like = `%${q}%`;
  const [{ data: people }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .or(`full_name.ilike.${like},bio.ilike.${like},linkedin.ilike.${like}`)
      .limit(30),
    supabase
      .from("posts")
      .select("*, author:profiles!posts_user_id_fkey(*)")
      .or(`title.ilike.${like},description.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return { people: (people ?? []) as Profile[], posts: (posts ?? []) as Post[] };
}
