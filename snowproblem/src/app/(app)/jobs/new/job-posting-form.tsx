"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, X, MapPin, Loader2 } from "lucide-react";

const areaOptions = [
  { value: "driveway", label: "Driveway" },
  { value: "sidewalk", label: "Sidewalk" },
  { value: "walkway", label: "Walkway" },
  { value: "stairs", label: "Stairs/Steps" },
  { value: "parking", label: "Parking Area" },
  { value: "patio", label: "Patio/Deck" },
  { value: "roof", label: "Roof" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  address: z.string().min(5, "Please enter a valid address"),
  property_type: z.enum(["residential", "commercial"]),
  areas: z.array(z.string()).min(1, "Select at least one area"),
  estimated_sqft: z.number().min(1).optional(),
  desired_completion_time: z.string().min(1, "Select when you need this done"),
});

type FormData = z.infer<typeof formSchema>;

interface JobPostingFormProps {
  userId: string;
  defaultAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
}

export function JobPostingForm({
  userId,
  defaultAddress,
  defaultLat,
  defaultLng,
}: JobPostingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{
    lat: number | null;
    lng: number | null;
  }>({
    lat: defaultLat ?? null,
    lng: defaultLng ?? null,
  });
  const [geocoding, setGeocoding] = useState(false);

  const supabase = createClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: defaultAddress ?? "",
      property_type: "residential",
      areas: [],
      estimated_sqft: undefined,
      desired_completion_time: "",
    },
  });

  const selectedAreas = form.watch("areas");

  const toggleArea = (area: string) => {
    const current = form.getValues("areas");
    if (current.includes(area)) {
      form.setValue(
        "areas",
        current.filter((a) => a !== area)
      );
    } else {
      form.setValue("areas", [...current, area]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newPhotos]);

    // Create preview URLs
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

  const geocodeAddress = async (address: string) => {
    if (!address || address.length < 5) return;

    setGeocoding(true);
    try {
      // Use Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setCoordinates({ lat, lng });
        form.setValue("address", data.features[0].place_name);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
          );
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            form.setValue("address", data.features[0].place_name);
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
        }
        setGeocoding(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location");
        setGeocoding(false);
      }
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!coordinates.lat || !coordinates.lng) {
      toast.error("Please enter a valid address");
      return;
    }

    setLoading(true);

    try {
      // Upload photos first
      const uploadedUrls: string[] = [];

      for (const photo of photos) {
        const fileExt = photo.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

      // Create job
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          owner_id: userId,
          title: data.title,
          description: data.description,
          address: data.address,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          property_type: data.property_type,
          areas: data.areas,
          estimated_sqft: data.estimated_sqft,
          desired_completion_time: new Date(data.desired_completion_time).toISOString(),
          before_photos: uploadedUrls,
          status: "bidding",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Job posted successfully!");
      router.push(`/jobs/${job.id}`);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to post job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Generate time options for the next 48 hours
  const timeOptions = generateTimeOptions();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              Describe what needs to be cleared
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Driveway and sidewalk snow removal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions or details..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areas"
              render={() => (
                <FormItem>
                  <FormLabel>Areas to Clear</FormLabel>
                  <FormDescription>
                    Select all areas that need snow removal
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {areaOptions.map((area) => (
                      <button
                        key={area.value}
                        type="button"
                        onClick={() => toggleArea(area.value)}
                        className={`p-3 rounded-lg border-2 transition-colors text-sm ${
                          selectedAreas.includes(area.value)
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/50"
                        }`}
                        aria-pressed={selectedAreas.includes(area.value)}
                      >
                        {area.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_sqft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Size (sq ft, optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 500"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Helps providers give accurate bids
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Where is the job located?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="123 Main St, City, State"
                        {...field}
                        onBlur={(e) => geocodeAddress(e.target.value)}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={useCurrentLocation}
                      disabled={geocoding}
                      aria-label="Use current location"
                    >
                      {geocoding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {coordinates.lat && coordinates.lng && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Location confirmed
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              Add photos of the area (up to 5)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {photoUrls.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timing</CardTitle>
            <CardDescription>
              When do you need this completed?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="desired_completion_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion Deadline</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when you need this done" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Job"
          )}
        </Button>
      </form>
    </Form>
  );
}

function generateTimeOptions() {
  const options = [];
  const now = new Date();

  // ASAP option
  options.push({
    value: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    label: "ASAP (within 2 hours)",
  });

  // Options for next 48 hours at various intervals
  const intervals = [4, 6, 8, 12, 24, 48];

  for (const hours of intervals) {
    const date = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const label =
      hours < 24
        ? `Within ${hours} hours`
        : hours === 24
        ? "Tomorrow"
        : "Within 2 days";

    options.push({
      value: date.toISOString(),
      label,
    });
  }

  return options;
}
