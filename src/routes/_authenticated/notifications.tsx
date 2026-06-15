import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/teamup-api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/teamup/Avatar";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotifPage });

function NotifPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notifs, isLoading } = useQuery({ queryKey: ["notifications", user?.id], queryFn: () => fetchNotifications(user!.id), enabled: !!user });
  const markRead = useMutation({
    mutationFn: async () => { if (!user) return; await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  useEffect(() => {
    if (notifs?.some((n) => !n.read)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs?.length]);
  return (
    <div className="space-y-2">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-navy-light px-1 mb-2">Activity</h2>
      {isLoading && <p className="text-sm text-navy-light py-8 text-center">Loading…</p>}
      {!isLoading && (!notifs || notifs.length === 0) && <p className="text-sm text-navy-light py-8 text-center">No notifications yet.</p>}
      {notifs?.map((n) => {
        const actor = (n as unknown as { actor?: { full_name?: string; photo_url?: string } }).actor;
        return (
          <div key={n.id} className="bg-paper rounded-xl border border-navy-dark/5 p-3 flex items-center gap-3">
            <Avatar name={actor?.full_name || "?"} photoUrl={actor?.photo_url} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-navy-dark">{n.message}</p>
              <p className="text-[10px] font-mono uppercase text-navy-light mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
