import { createFileRoute } from "@tanstack/react-router";
import { ProfileView } from "@/components/teamup/ProfileView";
import { useAuth } from "@/hooks/useAuth";

function Component() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  return <ProfileView userId={userId} isOwn={user?.id === userId} />;
}

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: Component,
});
