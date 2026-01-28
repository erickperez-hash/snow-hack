import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST() {
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
    .select("stripe_account_id, email")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id;

  // Create Stripe Connect account if it doesn't exist
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: profile?.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        user_id: user.id,
      },
    });

    accountId = account.id;

    // Save account ID to profile
    await supabase
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
  }

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(accountLink.url);
}
