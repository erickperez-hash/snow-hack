import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
import {
  MapPin,
  Clock,
  Calendar,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { BidForm } from "./bid-form";
import { BidList } from "./bid-list";
import { JobActions } from "./job-actions";

export const metadata: Metadata = {
  title: "Job Details - SnowProblem",
  description: "View job details and bids",
};

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get job with owner and provider details
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      `
      *,
      owner:profiles!owner_id(*),
      provider:profiles!provider_id(*)
    `
    )
    .eq("id", id)
    .single();

  if (error || !job) {
    notFound();
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const isOwner = job.owner_id === user!.id;
  const isProvider = profile?.role === "service_provider";
  const isAssignedProvider = job.provider_id === user!.id;

  // Get bids for this job
  const { data: bids } = await supabase
    .from("bids")
    .select("*, provider:profiles!provider_id(*)")
    .eq("job_id", id)
    .order("created_at", { ascending: true });

  // Check if current user has already bid
  const userBid = bids?.find((bid) => bid.provider_id === user!.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <Badge variant={getStatusVariant(job.status)}>
              {formatStatus(job.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {job.address}
            </span>
          </div>
        </div>

        {(isOwner || isAssignedProvider) && (
          <JobActions job={job} isOwner={isOwner} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          {job.before_photos && job.before_photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {job.before_photos.map((url: string, index: number) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={`Job photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* After photos (if completed) */}
          {job.status === "completed" &&
            job.after_photos &&
            job.after_photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Completion Photos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {job.after_photos.map((url: string, index: number) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden"
                      >
                        <Image
                          src={url}
                          alt={`Completion photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Description */}
          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Bids section - only show to owner or if user is a provider */}
          {(isOwner || isProvider) && job.status === "bidding" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Bids ({bids?.length ?? 0})
                </CardTitle>
                <CardDescription>
                  {isOwner
                    ? "Review bids from service providers"
                    : "Submit your bid for this job"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProvider && !userBid && (
                  <>
                    <BidForm jobId={job.id} providerId={user!.id} />
                    <Separator className="my-6" />
                  </>
                )}

                {userBid && !isOwner && (
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <p className="font-medium">Your Bid</p>
                    <p className="text-2xl font-bold">
                      ${userBid.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userBid.estimated_duration_minutes} min estimated
                    </p>
                    {userBid.message && (
                      <p className="mt-2 text-sm">{userBid.message}</p>
                    )}
                  </div>
                )}

                {isOwner && bids && bids.length > 0 && (
                  <BidList bids={bids} jobId={job.id} />
                )}

                {isOwner && (!bids || bids.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">
                    No bids yet. Service providers in your area will be notified.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assigned provider */}
          {job.provider && job.status !== "bidding" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={job.provider.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {job.provider.full_name?.charAt(0) ?? "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{job.provider.full_name}</p>
                    {job.provider.rating && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {job.provider.rating} ({job.provider.total_reviews}{" "}
                        reviews)
                      </p>
                    )}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/messages?job=${job.id}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Completion Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.desired_completion_time), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Posted</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(job.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Areas to Clear</p>
                <div className="flex flex-wrap gap-1">
                  {job.areas.map((area: string) => (
                    <Badge key={area} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              {job.estimated_sqft && (
                <div>
                  <p className="text-sm font-medium">Estimated Size</p>
                  <p className="text-sm text-muted-foreground">
                    {job.estimated_sqft} sq ft
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">Property Type</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {job.property_type}
                </p>
              </div>

              {job.final_amount && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium">Final Amount</p>
                    <p className="text-2xl font-bold">
                      ${job.final_amount.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Posted by */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posted By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={job.owner.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {job.owner.full_name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{job.owner.full_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {job.owner.role.replace("_", " ")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment status for completed jobs */}
          {job.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {job.payment_status === "released" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    job.payment_status === "released" ? "default" : "secondary"
                  }
                >
                  {formatStatus(job.payment_status)}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case "pending":
    case "bidding":
      return "secondary" as const;
    case "accepted":
    case "in_progress":
      return "default" as const;
    case "completed":
      return "outline" as const;
    case "disputed":
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
