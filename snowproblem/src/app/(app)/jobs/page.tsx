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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Jobs - SnowProblem",
  description: "Browse and manage snow removal jobs",
};

export default async function JobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isProvider = profile?.role === "service_provider";

  // Get jobs based on role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myJobs: any[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let availableJobs: any[] | null = null;

  if (isProvider) {
    // Provider's accepted/in-progress jobs
    const { data: myData } = await supabase
      .from("jobs")
      .select("*, owner:profiles!owner_id(full_name, avatar_url)")
      .eq("provider_id", user!.id)
      .in("status", ["accepted", "in_progress", "completed"])
      .order("created_at", { ascending: false });
    myJobs = myData;

    // Available jobs to bid on
    const { data: availData } = await supabase
      .from("jobs")
      .select("*, owner:profiles!owner_id(full_name, avatar_url), bids(count)")
      .eq("status", "bidding")
      .order("created_at", { ascending: false });
    availableJobs = availData;
  } else {
    // Owner's jobs
    const { data } = await supabase
      .from("jobs")
      .select("*, provider:profiles!provider_id(full_name, avatar_url, rating), bids(count)")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });
    myJobs = data;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            {isProvider
              ? "Find jobs and manage your work"
              : "Manage your snow removal requests"}
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

      {isProvider ? (
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="my-jobs">My Jobs</TabsTrigger>
          </TabsList>
          <TabsContent value="available" className="space-y-4">
            <JobList jobs={availableJobs} isProvider />
          </TabsContent>
          <TabsContent value="my-jobs" className="space-y-4">
            <JobList jobs={myJobs} isProvider />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-4">
            <JobList
              jobs={myJobs?.filter(
                (j) => !["completed", "cancelled"].includes(j.status)
              )}
              isProvider={false}
            />
          </TabsContent>
          <TabsContent value="completed" className="space-y-4">
            <JobList
              jobs={myJobs?.filter((j) =>
                ["completed", "cancelled"].includes(j.status)
              )}
              isProvider={false}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface JobListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jobs: any[] | null | undefined;
  isProvider: boolean;
}

function JobList({ jobs, isProvider }: JobListProps) {
  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No jobs found</p>
          {!isProvider && (
            <Button asChild className="mt-4">
              <Link href="/jobs/new">Post a Job</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {jobs.map((job) => {
        const bidCount = job.bids?.[0]?.count ?? 0;

        return (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      {job.address.split(",").slice(0, 2).join(",")}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(job.status)}>
                    {formatStatus(job.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    Due{" "}
                    {formatDistanceToNow(new Date(job.desired_completion_time), {
                      addSuffix: true,
                    })}
                  </span>
                  {job.status === "bidding" && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" aria-hidden="true" />
                      {bidCount} bid{bidCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {job.areas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.areas.slice(0, 3).map((area: string) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {job.areas.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.areas.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
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
