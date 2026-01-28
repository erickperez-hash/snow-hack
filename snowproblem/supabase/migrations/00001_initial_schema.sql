-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom types
CREATE TYPE user_role AS ENUM ('property_owner', 'vehicle_owner', 'service_provider');
CREATE TYPE equipment_type AS ENUM ('shovel', 'snow_blower', 'plow', 'salt_spreader');
CREATE TYPE job_status AS ENUM ('pending', 'bidding', 'accepted', 'in_progress', 'completed', 'disputed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role user_role DEFAULT 'property_owner' NOT NULL,
    -- Service provider fields
    equipment_types equipment_type[] DEFAULT '{}',
    service_radius_miles NUMERIC(5,2) DEFAULT 10,
    is_available BOOLEAN DEFAULT true,
    rating NUMERIC(3,2),
    total_reviews INTEGER DEFAULT 0,
    total_jobs_completed INTEGER DEFAULT 0,
    bio TEXT,
    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    -- Location (for service providers and default property location)
    default_latitude NUMERIC(10,7),
    default_longitude NUMERIC(10,7),
    default_address TEXT,
    -- Geometry column for spatial queries
    location GEOGRAPHY(POINT, 4326)
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status job_status DEFAULT 'pending' NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    -- Location
    address TEXT NOT NULL,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    -- Job details
    property_type TEXT DEFAULT 'residential',
    areas TEXT[] DEFAULT '{}',
    estimated_sqft INTEGER,
    -- Scheduling
    desired_completion_time TIMESTAMPTZ NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    -- Photos (array of R2 URLs)
    before_photos TEXT[] DEFAULT '{}',
    after_photos TEXT[] DEFAULT '{}',
    -- Selected bid
    accepted_bid_id UUID,
    provider_id UUID REFERENCES profiles(id),
    -- Payment
    payment_status payment_status DEFAULT 'pending',
    payment_intent_id TEXT,
    final_amount NUMERIC(10,2),
    -- Completion
    completed_at TIMESTAMPTZ,
    owner_confirmed BOOLEAN DEFAULT false
);

-- Bids table
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status bid_status DEFAULT 'pending' NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    message TEXT,
    can_start_immediately BOOLEAN DEFAULT false,
    UNIQUE(job_id, provider_id)
);

-- Add foreign key for accepted_bid_id after bids table exists
ALTER TABLE jobs ADD CONSTRAINT fk_accepted_bid
    FOREIGN KEY (accepted_bid_id) REFERENCES bids(id);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    UNIQUE(job_id, reviewer_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read_at TIMESTAMPTZ
);

-- Favorite providers table
CREATE TABLE favorite_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(owner_id, provider_id)
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_location ON profiles USING GIST(location);
CREATE INDEX idx_profiles_available ON profiles(is_available) WHERE role = 'service_provider';

CREATE INDEX idx_jobs_owner ON jobs(owner_id);
CREATE INDEX idx_jobs_provider ON jobs(provider_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX idx_jobs_completion_time ON jobs(desired_completion_time);

CREATE INDEX idx_bids_job ON bids(job_id);
CREATE INDEX idx_bids_provider ON bids(provider_id);
CREATE INDEX idx_bids_status ON bids(status);

CREATE INDEX idx_messages_job ON messages(job_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id) WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- Function to update location geography from lat/lng
CREATE OR REPLACE FUNCTION update_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_latitude IS NOT NULL AND NEW.default_longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.default_longitude, NEW.default_latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_job_location_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for location
CREATE TRIGGER trigger_update_profile_location
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_location_geography();

CREATE TRIGGER trigger_update_job_location
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_job_location_geography();

-- Function to find nearby providers
CREATE OR REPLACE FUNCTION nearby_providers(
    lat NUMERIC,
    lng NUMERIC,
    radius_miles NUMERIC DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    equipment_types equipment_type[],
    rating NUMERIC,
    total_reviews INTEGER,
    distance_miles NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.avatar_url,
        p.equipment_types,
        p.rating,
        p.total_reviews,
        (ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) / 1609.34)::NUMERIC(10,2) as distance_miles
    FROM profiles p
    WHERE p.role = 'service_provider'
        AND p.is_available = true
        AND p.location IS NOT NULL
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_miles * 1609.34
        )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Function to update provider rating
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET
        rating = (
            SELECT AVG(rating)::NUMERIC(3,2)
            FROM reviews
            WHERE reviewee_id = NEW.reviewee_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewee_id = NEW.reviewee_id
        )
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_rating
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bids_updated_at
    BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_providers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Jobs policies
CREATE POLICY "Jobs are viewable by everyone"
    ON jobs FOR SELECT
    USING (true);

CREATE POLICY "Owners can create jobs"
    ON jobs FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and providers can update their jobs"
    ON jobs FOR UPDATE
    USING (auth.uid() = owner_id OR auth.uid() = provider_id);

CREATE POLICY "Owners can delete their pending jobs"
    ON jobs FOR DELETE
    USING (auth.uid() = owner_id AND status = 'pending');

-- Bids policies
CREATE POLICY "Bids are viewable by job owner and bid provider"
    ON bids FOR SELECT
    USING (
        auth.uid() = provider_id
        OR auth.uid() IN (SELECT owner_id FROM jobs WHERE id = job_id)
    );

CREATE POLICY "Service providers can create bids"
    ON bids FOR INSERT
    WITH CHECK (
        auth.uid() = provider_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'service_provider'
        )
    );

CREATE POLICY "Providers can update own bids"
    ON bids FOR UPDATE
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete pending bids"
    ON bids FOR DELETE
    USING (auth.uid() = provider_id AND status = 'pending');

-- Messages policies
CREATE POLICY "Users can view their messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
    ON messages FOR UPDATE
    USING (auth.uid() = recipient_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create reviews for completed jobs"
    ON reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM jobs
            WHERE id = job_id
            AND status = 'completed'
            AND (owner_id = auth.uid() OR provider_id = auth.uid())
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Favorite providers policies
CREATE POLICY "Users can view own favorites"
    ON favorite_providers FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can add favorites"
    ON favorite_providers FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can remove favorites"
    ON favorite_providers FOR DELETE
    USING (auth.uid() = owner_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
