import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Briefcase, CheckCircle } from "lucide-react";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile - SnowProblem",
  description: "Your profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  if (!profile) {
    return null;
  }

  const isProvider = profile.role === "service_provider";

  // Get recent reviews if provider
  let reviews = null;
  if (isProvider) {
    const { data } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviewer_id(full_name, avatar_url)")
      .eq("reviewee_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5);
    reviews = data;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">
                {profile.full_name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-muted-foreground">{profile.email}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="capitalize">
                  {profile.role.replace("_", " ")}
                </Badge>

                {isProvider && profile.rating && (
                  <Badge variant="outline">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                    {profile.rating} ({profile.total_reviews} reviews)
                  </Badge>
                )}

                {isProvider && (
                  <Badge variant="outline">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {profile.total_jobs_completed} jobs
                  </Badge>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {profile.bio}
                </p>
              )}

              {profile.default_address && (
                <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.default_address.split(",").slice(0, 2).join(",")}
                </p>
              )}
            </div>
          </div>

          {isProvider && profile.equipment_types && profile.equipment_types.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-sm font-medium mb-2">Equipment</p>
                <div className="flex flex-wrap gap-2">
                  {profile.equipment_types.map((equipment: string) => (
                    <Badge key={equipment} variant="outline">
                      {formatEquipment(equipment)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {isProvider && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Availability</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.is_available
                      ? "Currently accepting jobs"
                      : "Not accepting jobs"}
                  </p>
                </div>
                <Badge variant={profile.is_available ? "default" : "secondary"}>
                  {profile.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium">Service Radius</p>
                <p className="text-sm text-muted-foreground">
                  {profile.service_radius_miles} miles
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* Reviews */}
      {isProvider && reviews && reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>
              What customers are saying about you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.reviewer?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {review.reviewer?.full_name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{review.reviewer?.full_name}</p>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stripe Connect */}
      {isProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Setup</CardTitle>
            <CardDescription>
              Configure your payment settings to receive earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.stripe_onboarding_complete ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Payment account connected</span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your account to start receiving payments for completed jobs.
                </p>
                <form action="/api/stripe/connect" method="POST">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Connect with Stripe
                  </button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatEquipment(equipment: string) {
  return equipment
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
