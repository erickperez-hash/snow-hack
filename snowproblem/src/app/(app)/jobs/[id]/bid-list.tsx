"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Star, Clock, Zap, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/types/database";

interface Bid {
  id: string;
  created_at: string;
  amount: number;
  estimated_duration_minutes: number;
  message: string | null;
  can_start_immediately: boolean;
  status: string;
  provider: Profile;
}

interface BidListProps {
  bids: Bid[];
  jobId: string;
}

export function BidList({ bids, jobId }: BidListProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);
  const supabase = createClient();

  const handleAcceptBid = async (bid: Bid) => {
    setAccepting(bid.id);

    try {
      // Update job with accepted bid
      const { error: jobError } = await supabase
        .from("jobs")
        .update({
          accepted_bid_id: bid.id,
          provider_id: bid.provider.id,
          final_amount: bid.amount,
          status: "accepted",
        })
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Update bid status
      const { error: bidError } = await supabase
        .from("bids")
        .update({ status: "accepted" })
        .eq("id", bid.id);

      if (bidError) throw bidError;

      // Reject other bids
      await supabase
        .from("bids")
        .update({ status: "rejected" })
        .eq("job_id", jobId)
        .neq("id", bid.id);

      toast.success("Bid accepted! The provider has been notified.");
      router.refresh();
    } catch (error) {
      console.error("Accept bid error:", error);
      toast.error("Failed to accept bid. Please try again.");
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-4">
      {bids.map((bid) => (
        <div
          key={bid.id}
          className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={bid.provider.avatar_url ?? undefined} />
              <AvatarFallback>
                {bid.provider.full_name?.charAt(0) ?? "P"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{bid.provider.full_name}</p>
                {bid.provider.rating && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {bid.provider.rating}
                  </span>
                )}
                {bid.can_start_immediately && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Available Now
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {bid.estimated_duration_minutes} min
                </span>
                <span>
                  {formatDistanceToNow(new Date(bid.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {bid.message && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {bid.message}
                </p>
              )}

              {bid.provider.equipment_types &&
                bid.provider.equipment_types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bid.provider.equipment_types.map((equipment) => (
                      <Badge
                        key={equipment}
                        variant="outline"
                        className="text-xs"
                      >
                        {formatEquipment(equipment)}
                      </Badge>
                    ))}
                  </div>
                )}
            </div>

            <div className="text-right">
              <p className="text-xl font-bold">${bid.amount.toFixed(2)}</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => handleAcceptBid(bid)}
                disabled={accepting !== null}
              >
                {accepting === bid.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Accept"
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatEquipment(equipment: string) {
  return equipment
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
