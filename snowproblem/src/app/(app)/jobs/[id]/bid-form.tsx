"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, DollarSign, Clock } from "lucide-react";

const formSchema = z.object({
  amount: z.number().min(1, "Amount must be at least $1"),
  estimated_duration_minutes: z
    .number()
    .min(5, "Duration must be at least 5 minutes"),
  message: z.string().max(500).optional(),
  can_start_immediately: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface BidFormProps {
  jobId: string;
  providerId: string;
}

export function BidForm({ jobId, providerId }: BidFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      estimated_duration_minutes: 30,
      message: "",
      can_start_immediately: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      const { error } = await supabase.from("bids").insert({
        job_id: jobId,
        provider_id: providerId,
        amount: data.amount,
        estimated_duration_minutes: data.estimated_duration_minutes,
        message: data.message || null,
        can_start_immediately: data.can_start_immediately,
      });

      if (error) throw error;

      toast.success("Bid submitted successfully!");
      router.refresh();
    } catch (error) {
      console.error("Bid error:", error);
      toast.error("Failed to submit bid. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Bid ($)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      className="pl-9"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estimated_duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Est. Time (min)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="5"
                      className="pl-9"
                      placeholder="30"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 30)
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Introduce yourself or add any notes..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Let the owner know why they should choose you
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="can_start_immediately"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </FormControl>
              <FormLabel className="!mt-0 font-normal">
                I can start immediately
              </FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Bid"
          )}
        </Button>
      </form>
    </Form>
  );
}
