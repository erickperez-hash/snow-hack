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
import { Loader2 } from "lucide-react";
import type { Profile, EquipmentType } from "@/types/database";

const equipmentOptions: { value: EquipmentType; label: string }[] = [
  { value: "shovel", label: "Shovel" },
  { value: "snow_blower", label: "Snow Blower" },
  { value: "plow", label: "Plow" },
  { value: "salt_spreader", label: "Salt Spreader" },
];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  default_address: z.string().optional(),
  // Provider specific
  equipment_types: z.array(z.enum(["shovel", "snow_blower", "plow", "salt_spreader"])).optional(),
  service_radius_miles: z.number().min(1).max(50).optional(),
  is_available: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const isProvider = profile.role === "service_provider";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      default_address: profile.default_address ?? "",
      equipment_types: profile.equipment_types ?? [],
      service_radius_miles: profile.service_radius_miles ?? 10,
      is_available: profile.is_available ?? true,
    },
  });

  const selectedEquipment = form.watch("equipment_types") ?? [];

  const toggleEquipment = (equipment: EquipmentType) => {
    const current = form.getValues("equipment_types") ?? [];
    if (current.includes(equipment)) {
      form.setValue(
        "equipment_types",
        current.filter((e) => e !== equipment)
      );
    } else {
      form.setValue("equipment_types", [...current, equipment]);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        full_name: data.full_name,
        phone: data.phone,
        bio: data.bio,
        default_address: data.default_address,
      };

      if (isProvider) {
        updateData.equipment_types = data.equipment_types;
        updateData.service_radius_miles = data.service_radius_miles;
        updateData.is_available = data.is_available;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="(555) 123-4567" {...field} />
              </FormControl>
              <FormDescription>For job updates and notifications</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="123 Main St, City, State"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {isProvider
                  ? "Your location for finding nearby jobs"
                  : "Pre-fill for future job postings"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={
                    isProvider
                      ? "Tell customers about your experience..."
                      : "Tell us about yourself..."
                  }
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isProvider && (
          <>
            <FormField
              control={form.control}
              name="equipment_types"
              render={() => (
                <FormItem>
                  <FormLabel>Your Equipment</FormLabel>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {equipmentOptions.map((equipment) => (
                      <button
                        key={equipment.value}
                        type="button"
                        onClick={() => toggleEquipment(equipment.value)}
                        className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                          selectedEquipment.includes(equipment.value)
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        aria-pressed={selectedEquipment.includes(equipment.value)}
                      >
                        {equipment.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_radius_miles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Radius (miles)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 10)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    How far are you willing to travel for jobs?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_available"
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
                    Available for new jobs
                  </FormLabel>
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </form>
    </Form>
  );
}
