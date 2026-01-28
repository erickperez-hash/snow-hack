"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Camera,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Play,
} from "lucide-react";
import type { Job } from "@/types/database";

interface JobActionsProps {
  job: Job;
  isOwner: boolean;
}

export function JobActions({ job, isOwner }: JobActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newPhotos]);

    newPhotos.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoUrls((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartJob = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "in_progress" })
        .eq("id", job.id);

      if (error) throw error;

      toast.success("Job started! Good luck!");
      router.refresh();
    } catch (error) {
      console.error("Start job error:", error);
      toast.error("Failed to start job");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (photos.length === 0) {
      toast.error("Please upload at least one completion photo");
      return;
    }

    setLoading(true);
    try {
      // Upload photos
      const uploadedUrls: string[] = [];

      for (const photo of photos) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${job.id}/after-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("job-photos")
          .upload(fileName, photo);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("job-photos")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Update job
      const { error } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          after_photos: uploadedUrls,
          completed_at: new Date().toISOString(),
          payment_status: "held",
        })
        .eq("id", job.id);

      if (error) throw error;

      toast.success("Job marked as complete! Waiting for owner confirmation.");
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Complete job error:", error);
      toast.error("Failed to complete job");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({
          owner_confirmed: true,
          payment_status: "released",
        })
        .eq("id", job.id);

      if (error) throw error;

      // Update provider stats
      await supabase.rpc("increment_provider_jobs", {
        provider_id: job.provider_id,
      });

      toast.success("Job confirmed! Payment has been released.");
      router.refresh();
    } catch (error) {
      console.error("Confirm error:", error);
      toast.error("Failed to confirm job");
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "disputed" })
        .eq("id", job.id);

      if (error) throw error;

      toast.success("Dispute filed. We'll review this shortly.");
      router.refresh();
    } catch (error) {
      console.error("Dispute error:", error);
      toast.error("Failed to file dispute");
    } finally {
      setLoading(false);
    }
  };

  // Provider actions
  if (!isOwner) {
    if (job.status === "accepted") {
      return (
        <Button onClick={handleStartJob} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Start Job
        </Button>
      );
    }

    if (job.status === "in_progress") {
      return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
              <DialogDescription>
                Upload photos showing the completed work
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Completion photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">
                      Add Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <Button
                onClick={handleCompleteJob}
                disabled={loading || photos.length === 0}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Submit Completion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return null;
  }

  // Owner actions
  if (job.status === "completed" && !job.owner_confirmed) {
    return (
      <div className="flex gap-2">
        <Button onClick={handleConfirmCompletion} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Confirm & Pay
        </Button>
        <Button variant="outline" onClick={handleDispute} disabled={loading}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Dispute
        </Button>
      </div>
    );
  }

  return null;
}
