import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile - SnowProblem",
  description: "Set up your SnowProblem profile",
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.full_name) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <OnboardingForm
        userId={user.id}
        email={user.email ?? ""}
        defaultName={user.user_metadata?.full_name ?? ""}
        avatarUrl={user.user_metadata?.avatar_url}
      />
    </main>
  );
}
