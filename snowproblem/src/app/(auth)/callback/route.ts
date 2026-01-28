import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        // If profile exists and has been set up, go to dashboard
        if (profile?.full_name) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      // Otherwise, redirect to onboarding
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
