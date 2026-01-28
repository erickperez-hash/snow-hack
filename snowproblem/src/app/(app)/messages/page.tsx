import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages - SnowProblem",
  description: "Your conversations",
};

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all jobs the user is involved in (as owner or provider)
  const { data: jobs } = await supabase
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
    .or(`owner_id.eq.${user!.id},provider_id.eq.${user!.id}`)
    .not("provider_id", "is", null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .order("updated_at", { ascending: false }) as { data: any[] | null };

  // Get latest message and unread count for each job
  const jobsWithMessages = await Promise.all(
    (jobs ?? []).map(async (job) => {
      const { data: latestMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("job_id", job.id)
        .eq("recipient_id", user!.id)
        .is("read_at", null);

      const otherPerson =
        job.owner_id === user!.id ? job.provider : job.owner;

      return {
        ...job,
        latestMessage,
        unreadCount: unreadCount ?? 0,
        otherPerson,
      };
    })
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Conversations about your jobs
        </p>
      </div>

      {jobsWithMessages.length > 0 ? (
        <div className="space-y-2">
          {jobsWithMessages.map((job) => (
            <Link
              key={job.id}
              href={`/messages/${job.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={job.otherPerson?.avatar_url ?? undefined}
                      />
                      <AvatarFallback>
                        {job.otherPerson?.full_name?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {job.otherPerson?.full_name}
                        </p>
                        {job.unreadCount > 0 && (
                          <Badge variant="default" className="text-xs">
                            {job.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.title}
                      </p>
                      {job.latestMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {job.latestMessage.sender_id === user!.id
                            ? "You: "
                            : ""}
                          {job.latestMessage.content}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      {job.latestMessage && (
                        <p>
                          {formatDistanceToNow(
                            new Date(job.latestMessage.created_at),
                            { addSuffix: true }
                          )}
                        </p>
                      )}
                      <Badge variant="outline" className="mt-1">
                        {formatStatus(job.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Messages will appear here when you accept or bid on jobs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
