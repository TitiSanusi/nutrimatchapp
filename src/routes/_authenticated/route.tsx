import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNutriMatch } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/signin" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { ready, profile } = useNutriMatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onOnboarding = pathname.startsWith("/onboarding");

  // Anyone who hasn't finished setup resumes it; anyone who has never repeats it.
  useEffect(() => {
    if (!ready) return;
    if (!profile.onboarded && !onOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [ready, profile.onboarded, onOnboarding, navigate]);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!profile.onboarded && !onOnboarding) return <div className="min-h-screen bg-background" />;

  return <Outlet />;
}
