import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase } from "lucide-react";
import { MessageThread } from "./message-thread";

export const metadata: Metadata = {
  title: "Conversation - SnowProblem",
  description: "Job conversation",
};

interface MessagePageProps {
  params: Promise<{ jobId: string }>;
}

export default async function MessagePage({ params }: MessagePageProps) {
  const { jobId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get job with participants
  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      `
      id,
      title,
      status,
      owner_id,
      provider_id,
      owner:profiles!owner_id(id, full_name, avatar_url),
      provider:profiles!provider_id(id, full_name, avatar_url)
    `
    )
    .eq("id", jobId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .single() as { data: any; error: any };

  if (error || !job) {
    notFound();
  }

  // Verify user is participant
  if (job.owner_id !== user!.id && job.provider_id !== user!.id) {
    notFound();
  }

  const otherPerson = job.owner_id === user!.id ? job.provider : job.owner;

  // Get messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  // Mark messages as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .eq("recipient_id", user!.id)
    .is("read_at", null);

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/messages" aria-label="Back to messages">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={otherPerson?.avatar_url ?? undefined} />
          <AvatarFallback>
            {otherPerson?.full_name?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{otherPerson?.full_name}</p>
          <p className="text-sm text-muted-foreground truncate">{job.title}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{formatStatus(job.status)}</Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/jobs/${job.id}`}>
              <Briefcase className="w-4 h-4 mr-1" />
              View Job
            </Link>
          </Button>
        </div>
      </div>

      {/* Message thread */}
      <MessageThread
        jobId={jobId}
        currentUserId={user!.id}
        recipientId={otherPerson?.id ?? ""}
        initialMessages={messages ?? []}
      />
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
