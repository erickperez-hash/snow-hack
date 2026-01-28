import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobPostingForm } from "./job-posting-form";

export const metadata: Metadata = {
  title: "Post a Job - SnowProblem",
  description: "Create a new snow removal job request",
};

export default async function NewJobPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, default_address, default_latitude, default_longitude")
    .eq("id", user.id)
    .single();

  // Service providers can't post jobs
  if (profile?.role === "service_provider") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post a Snow Removal Job</h1>
        <p className="text-muted-foreground">
          Describe your job and receive bids from local service providers
        </p>
      </div>
      <JobPostingForm
        userId={user.id}
        defaultAddress={profile?.default_address}
        defaultLat={profile?.default_latitude}
        defaultLng={profile?.default_longitude}
      />
    </div>
  );
}
