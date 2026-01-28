export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "property_owner" | "vehicle_owner" | "service_provider";
export type EquipmentType = "shovel" | "snow_blower" | "plow" | "salt_spreader";
export type JobStatus =
  | "pending"
  | "bidding"
  | "accepted"
  | "in_progress"
  | "completed"
  | "disputed"
  | "cancelled";
export type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type PaymentStatus = "pending" | "held" | "released" | "refunded";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: UserRole;
          // Service provider specific fields
          equipment_types: EquipmentType[] | null;
          service_radius_miles: number | null;
          is_available: boolean;
          rating: number | null;
          total_reviews: number;
          total_jobs_completed: number;
          bio: string | null;
          // Stripe Connect
          stripe_account_id: string | null;
          stripe_onboarding_complete: boolean;
          // Location
          default_latitude: number | null;
          default_longitude: number | null;
          default_address: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          equipment_types?: EquipmentType[] | null;
          service_radius_miles?: number | null;
          is_available?: boolean;
          rating?: number | null;
          total_reviews?: number;
          total_jobs_completed?: number;
          bio?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          default_latitude?: number | null;
          default_longitude?: number | null;
          default_address?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          equipment_types?: EquipmentType[] | null;
          service_radius_miles?: number | null;
          is_available?: boolean;
          rating?: number | null;
          total_reviews?: number;
          total_jobs_completed?: number;
          bio?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          default_latitude?: number | null;
          default_longitude?: number | null;
          default_address?: string | null;
        };
      };
      jobs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          owner_id: string;
          status: JobStatus;
          title: string;
          description: string | null;
          // Location
          address: string;
          latitude: number;
          longitude: number;
          // Job details
          property_type: string; // residential, commercial
          areas: string[]; // sidewalk, driveway, parking, stairs
          estimated_sqft: number | null;
          // Scheduling
          desired_completion_time: string;
          is_recurring: boolean;
          // Photos
          before_photos: string[];
          after_photos: string[];
          // Selected bid
          accepted_bid_id: string | null;
          provider_id: string | null;
          // Payment
          payment_status: PaymentStatus;
          payment_intent_id: string | null;
          final_amount: number | null;
          // Completion
          completed_at: string | null;
          owner_confirmed: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          owner_id: string;
          status?: JobStatus;
          title: string;
          description?: string | null;
          address: string;
          latitude: number;
          longitude: number;
          property_type?: string;
          areas?: string[];
          estimated_sqft?: number | null;
          desired_completion_time: string;
          is_recurring?: boolean;
          before_photos?: string[];
          after_photos?: string[];
          accepted_bid_id?: string | null;
          provider_id?: string | null;
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          final_amount?: number | null;
          completed_at?: string | null;
          owner_confirmed?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          owner_id?: string;
          status?: JobStatus;
          title?: string;
          description?: string | null;
          address?: string;
          latitude?: number;
          longitude?: number;
          property_type?: string;
          areas?: string[];
          estimated_sqft?: number | null;
          desired_completion_time?: string;
          is_recurring?: boolean;
          before_photos?: string[];
          after_photos?: string[];
          accepted_bid_id?: string | null;
          provider_id?: string | null;
          payment_status?: PaymentStatus;
          payment_intent_id?: string | null;
          final_amount?: number | null;
          completed_at?: string | null;
          owner_confirmed?: boolean;
        };
      };
      bids: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          job_id: string;
          provider_id: string;
          status: BidStatus;
          amount: number;
          estimated_duration_minutes: number;
          message: string | null;
          can_start_immediately: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          job_id: string;
          provider_id: string;
          status?: BidStatus;
          amount: number;
          estimated_duration_minutes: number;
          message?: string | null;
          can_start_immediately?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          job_id?: string;
          provider_id?: string;
          status?: BidStatus;
          amount?: number;
          estimated_duration_minutes?: number;
          message?: string | null;
          can_start_immediately?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          created_at: string;
          job_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          job_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          job_id?: string;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          read_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          created_at: string;
          job_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          job_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          job_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read_at?: string | null;
        };
      };
      favorite_providers: {
        Row: {
          id: string;
          created_at: string;
          owner_id: string;
          provider_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          owner_id: string;
          provider_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          owner_id?: string;
          provider_id?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      nearby_providers: {
        Args: {
          lat: number;
          lng: number;
          radius_miles: number;
        };
        Returns: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          equipment_types: EquipmentType[];
          rating: number | null;
          total_reviews: number;
          distance_miles: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      equipment_type: EquipmentType;
      job_status: JobStatus;
      bid_status: BidStatus;
      payment_status: PaymentStatus;
    };
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Bid = Database["public"]["Tables"]["bids"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Extended types with relations
export type JobWithBids = Job & {
  bids: (Bid & { provider: Profile })[];
  owner: Profile;
};

export type BidWithDetails = Bid & {
  job: Job;
  provider: Profile;
};
