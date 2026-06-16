REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, role, bio, skills, linkedin, photo_url, created_at) ON public.profiles TO authenticated;
GRANT SELECT (email, phone) ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_contact()
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email, phone FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_contact() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_contact() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unlocked_contact(target uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.email, p.phone
  FROM public.profiles p
  WHERE p.id = target
    AND (
      auth.uid() = target
      OR EXISTS (
        SELECT 1 FROM public.team_up_requests t
        WHERE (t.requester_id = auth.uid() AND t.recipient_id = target)
           OR (t.recipient_id = auth.uid() AND t.requester_id = target)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_unlocked_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_unlocked_contact(uuid) TO authenticated;