import { Metadata } from "next";
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
import { Plus, MapPin, Clock, DollarSign, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Profile, Job } from "@/types/database";

export const metadata: Metadata = {
  title: "Dashboard - SnowProblem",
  description: "Your SnowProblem dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single() as { data: Profile | null };

  const isProvider = profile?.role === "service_provider";

  // Get recent jobs based on role
  let recentJobs: (Job & { owner?: Profile; provider?: Profile })[] | null = null;
  if (isProvider) {
    // For providers: get nearby available jobs
    const { data } = await supabase
      .from("jobs")
      .select("*, owner:profiles!owner_id(*)")
      .eq("status", "bidding")
      .order("created_at", { ascending: false })
      .limit(5) as { data: (Job & { owner: Profile })[] | null };
    recentJobs = data;
  } else {
    // For owners: get their jobs
    const { data } = await supabase
      .from("jobs")
      .select("*, provider:profiles!provider_id(*)")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5) as { data: (Job & { provider: Profile })[] | null };
    recentJobs = data;
  }

  // Get stats
  const { count: activeJobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq(isProvider ? "provider_id" : "owner_id", user!.id)
    .in("status", ["accepted", "in_progress"]);

  const { count: completedJobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq(isProvider ? "provider_id" : "owner_id", user!.id)
    .eq("status", "completed");

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="text-muted-foreground">
            {isProvider
              ? "Find and manage your snow removal jobs"
              : "Post jobs and track your snow removal requests"}
          </p>
        </div>
        {!isProvider && (
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Post a Job
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedJobsCount ?? 0}</div>
          </CardContent>
        </Card>
        {isProvider && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profile?.rating ? `${profile.rating}/5` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile?.total_reviews ?? 0} reviews
              </p>
            </CardContent>
          </Card>
        )}
        {!isProvider && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                vs average pricing
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent/Available Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isProvider ? "Available Jobs Nearby" : "Your Recent Jobs"}
          </CardTitle>
          <CardDescription>
            {isProvider
              ? "Jobs waiting for bids in your area"
              : "Track the status of your snow removal requests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs && recentJobs.length > 0 ? (
            <div className="space-y-4">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{job.title}</h3>
                        <Badge variant={getStatusVariant(job.status)}>
                          {formatStatus(job.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {job.address.split(",")[0]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatDistanceToNow(new Date(job.desired_completion_time), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    {isProvider && job.final_amount && (
                      <div className="text-right">
                        <p className="font-semibold">
                          ${job.final_amount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              <div className="pt-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href="/jobs">View All Jobs</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {isProvider
                  ? "No jobs available in your area right now"
                  : "You haven't posted any jobs yet"}
              </p>
              {!isProvider && (
                <Button asChild className="mt-4">
                  <Link href="/jobs/new">Post Your First Job</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
