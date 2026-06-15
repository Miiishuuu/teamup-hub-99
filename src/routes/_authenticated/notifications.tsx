import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/teamup-api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/teamup/Avatar";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotifPage });

function NotifPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: notifs, isLoading } = useQuery({ queryKey: ["notifications", user?.id], queryFn: () => fetchNotifications(user!.id), enabled: !!user });
  const markRead = useMutation({
    mutationFn: async () => { if (!user) return; await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const delOne = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Removed"); },
  });
  const clearAll = useMutation({
    mutationFn: async () => { if (!user) return; await supabase.from("notifications").delete().eq("user_id", user.id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("All cleared"); },
  });
  useEffect(() => {
    if (notifs?.some((n) => !n.read)) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs?.length]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-navy-light">Activity</h2>
        {notifs && notifs.length > 0 && (
          <button onClick={() => clearAll.mutate()} className="text-[10px] font-mono uppercase tracking-widest text-danger hover:underline">Clear all</button>
        )}
      </div>
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
            <button onClick={() => delOne.mutate(n.id)} aria-label="Delete" className="p-1.5 rounded-md text-navy-light hover:text-danger hover:bg-danger/5">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
