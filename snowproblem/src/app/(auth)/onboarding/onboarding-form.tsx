"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Car, Wrench, Snowflake, Check } from "lucide-react";
import type { UserRole, EquipmentType } from "@/types/database";

const roles: { value: UserRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "property_owner",
    label: "Property Owner",
    description: "I need snow removal for my property",
    icon: <Home className="w-6 h-6" />,
  },
  {
    value: "vehicle_owner",
    label: "Vehicle Owner",
    description: "I need my driveway or parking space cleared",
    icon: <Car className="w-6 h-6" />,
  },
  {
    value: "service_provider",
    label: "Service Provider",
    description: "I provide snow removal services",
    icon: <Wrench className="w-6 h-6" />,
  },
];

const equipmentOptions: { value: EquipmentType; label: string }[] = [
  { value: "shovel", label: "Shovel" },
  { value: "snow_blower", label: "Snow Blower" },
  { value: "plow", label: "Plow" },
  { value: "salt_spreader", label: "Salt Spreader" },
];

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  role: z.enum(["property_owner", "vehicle_owner", "service_provider"]),
  // Service provider specific fields
  equipment_types: z.array(z.enum(["shovel", "snow_blower", "plow", "salt_spreader"])).optional(),
  service_radius_miles: z.number().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface OnboardingFormProps {
  userId: string;
  email: string;
  defaultName: string;
  avatarUrl?: string;
}

export function OnboardingForm({
  userId,
  email,
  defaultName,
  avatarUrl,
}: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: defaultName,
      phone: "",
      role: "property_owner",
      equipment_types: [],
      service_radius_miles: 10,
      bio: "",
    },
  });

  const selectedRole = form.watch("role");
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
        role: data.role,
      };

      if (data.role === "service_provider") {
        updateData.equipment_types = data.equipment_types;
        updateData.service_radius_miles = data.service_radius_miles;
        updateData.bio = data.bio;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} alt={defaultName} />
            <AvatarFallback>
              <Snowflake className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          {step === 1
            ? "Tell us about yourself"
            : step === 2
            ? "How will you use SnowProblem?"
            : "Set up your service details"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input value={email} disabled />
                  <FormDescription>
                    Connected via your social login
                  </FormDescription>
                </FormItem>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        For important job updates
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Select your role</FormLabel>
                      <FormControl>
                        <div className="grid gap-3">
                          {roles.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => field.onChange(role.value)}
                              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                                field.value === role.value
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-primary/50"
                              }`}
                              aria-pressed={field.value === role.value}
                            >
                              <div
                                className={`p-2 rounded-full ${
                                  field.value === role.value
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {role.icon}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{role.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {role.description}
                                </p>
                              </div>
                              {field.value === role.value && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  {selectedRole === "service_provider" ? (
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => setStep(3)}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Setting up..." : "Complete Setup"}
                    </Button>
                  )}
                </div>
              </>
            )}

            {step === 3 && selectedRole === "service_provider" && (
              <>
                <FormField
                  control={form.control}
                  name="equipment_types"
                  render={() => (
                    <FormItem>
                      <FormLabel>Your Equipment</FormLabel>
                      <FormDescription>
                        Select all equipment you have available
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {equipmentOptions.map((equipment) => (
                          <button
                            key={equipment.value}
                            type="button"
                            onClick={() => toggleEquipment(equipment.value)}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              selectedEquipment.includes(equipment.value)
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-primary/50"
                            }`}
                            aria-pressed={selectedEquipment.includes(
                              equipment.value
                            )}
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
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About You (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell potential customers about your experience..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
