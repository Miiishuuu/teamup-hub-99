import { createFileRoute } from "@tanstack/react-router";
import { ProfileView } from "@/components/teamup/ProfileView";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile/")({
  component: () => {
    const { user } = useAuth();
    if (!user) return null;
    return <ProfileView userId={user.id} isOwn />;
  },
});
