import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function GET() {
  const stripe = getStripe();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(
      new URL("/profile?error=no_stripe_account", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // Check if onboarding is complete
  const account = await stripe.accounts.retrieve(profile.stripe_account_id);

  if (account.details_submitted) {
    await supabase
      .from("profiles")
      .update({ stripe_onboarding_complete: true })
      .eq("id", user.id);

    return NextResponse.redirect(
      new URL("/profile?stripe=success", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  return NextResponse.redirect(
    new URL("/profile?stripe=incomplete", process.env.NEXT_PUBLIC_APP_URL)
  );
}
