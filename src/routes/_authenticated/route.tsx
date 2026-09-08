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
  const { ready, session, profile } = useNutriMatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onOnboarding = pathname.startsWith("/onboarding");
  const needsSetup = !!session && ready && !profile.onboarded && !onOnboarding;

  // Anyone who hasn't finished setup resumes it; anyone who has never repeats it.
  useEffect(() => {
    if (needsSetup) navigate({ to: "/onboarding", replace: true });
  }, [needsSetup, navigate]);

  if (!ready || needsSetup) return <div className="min-h-screen bg-background" />;

  return <Outlet />;
}
