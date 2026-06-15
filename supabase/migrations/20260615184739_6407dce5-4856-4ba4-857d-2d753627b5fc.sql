
-- ===== ENUMS =====
CREATE TYPE public.account_role AS ENUM ('user', 'organizer', 'institution', 'organization');
CREATE TYPE public.post_type AS ENUM ('project', 'hackathon');
CREATE TYPE public.notification_type AS ENUM ('follow', 'interest_project', 'interest_hackathon', 'team_up', 'team_up_hackathon');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role public.account_role NOT NULL DEFAULT 'user',
  bio text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  linkedin text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== POSTS =====
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.post_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  venue text,
  event_date date,
  registration_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX posts_user_id_idx ON public.posts(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== FOLLOWS =====
CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_follower_idx ON public.follows(follower_id);
CREATE INDEX follows_following_idx ON public.follows(following_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
-- A user can see follow rows where they're the follower (to know who they follow / counts)
-- or where they're the following (their followers list).
CREATE POLICY "Users see own follow rows" ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users insert own follow" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follow" ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ===== POST_INTERESTS =====
CREATE TABLE public.post_interests (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX post_interests_post_idx ON public.post_interests(post_id);
CREATE INDEX post_interests_user_idx ON public.post_interests(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_interests TO authenticated;
GRANT ALL ON public.post_interests TO service_role;
ALTER TABLE public.post_interests ENABLE ROW LEVEL SECURITY;
-- Interests are public to authenticated (counts + interested list).
CREATE POLICY "Interests viewable" ON public.post_interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own interest" ON public.post_interests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own interest" ON public.post_interests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== POST_SAVES =====
CREATE TABLE public.post_saves (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX post_saves_user_idx ON public.post_saves(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
-- Private to owner.
CREATE POLICY "Users see own saves" ON public.post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own save" ON public.post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own save" ON public.post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== TEAM_UP_REQUESTS =====
CREATE TABLE public.team_up_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> recipient_id)
);
-- Unique per (requester, recipient, post) — treat NULL post as a single bucket via coalesce
CREATE UNIQUE INDEX team_up_unique ON public.team_up_requests
  (requester_id, recipient_id, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX team_up_recipient_idx ON public.team_up_requests(recipient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_up_requests TO authenticated;
GRANT ALL ON public.team_up_requests TO service_role;
ALTER TABLE public.team_up_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own team up rows" ON public.team_up_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Users insert own team up" ON public.team_up_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users delete own team up" ON public.team_up_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  message text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
-- Anyone signed in can insert a notification (acting on behalf of their action).
CREATE POLICY "Authenticated insert notification" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- ===== AUTO PROFILE CREATION =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.account_role, 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== FOLLOW COUNTS RPC (avoids leaking lists) =====
CREATE OR REPLACE FUNCTION public.get_follow_counts(target uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.follows WHERE following_id = target),
    (SELECT count(*) FROM public.follows WHERE follower_id = target)
$$;
GRANT EXECUTE ON FUNCTION public.get_follow_counts(uuid) TO authenticated;
