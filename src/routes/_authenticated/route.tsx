import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomDock } from "@/components/teamup/BottomDock";
import { TopHeader } from "@/components/teamup/TopHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <div className="min-h-screen bg-surface-wash text-navy-dark font-body">
      <TopHeader />
      <main className="mx-auto max-w-xl px-4 pt-4 pb-32">
        <Outlet />
      </main>
      <BottomDock />
    </div>
  ),
});
