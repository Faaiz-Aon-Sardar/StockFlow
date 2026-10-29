-- ============================================================================
-- Migration: 20261028000001_core_tenancy_and_auth.sql
-- Description: Core schema setup, tenancy, user profiles, business memberships,
--              RLS security functions, and automated user provisioning triggers.
-- ============================================================================

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Linked 1:1 to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'User identity metadata mirroring Supabase auth.users.';

-- ----------------------------------------------------------------------------
-- 2. BUSINESSES (Tenant master record)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trade_name TEXT,
    gstin VARCHAR(15),
    pan_number VARCHAR(10),
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    bank_name TEXT,
    account_no TEXT,
    ifsc_code VARCHAR(11),
    branch_name TEXT,
    upi_id TEXT,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
    default_payment_terms TEXT NOT NULL DEFAULT 'net_15' 
        CHECK (default_payment_terms IN ('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60')),
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    order_prefix TEXT NOT NULL DEFAULT 'SO-',
    purchase_prefix TEXT NOT NULL DEFAULT 'PO-',
    dispatch_prefix TEXT NOT NULL DEFAULT 'DSP-',
    payment_prefix TEXT NOT NULL DEFAULT 'RCP-',
    valuation_method TEXT NOT NULL DEFAULT 'fifo' 
        CHECK (valuation_method IN ('fifo', 'weighted_avg')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_gstin_format CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

COMMENT ON TABLE public.businesses IS 'Tenants / wholesale business entities.';

-- ----------------------------------------------------------------------------
-- 3. BUSINESS MEMBERS (Tenancy Membership and RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'sales', 'store', 'accounts')),
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_member UNIQUE (business_id, user_id)
);

CREATE INDEX idx_business_members_user ON public.business_members(user_id);
CREATE INDEX idx_business_members_business ON public.business_members(business_id);

COMMENT ON TABLE public.business_members IS 'Association between users and tenant businesses, granting roles.';

-- ----------------------------------------------------------------------------
-- 4. RLS HELPER FUNCTIONS (Security Definer functions for clean RLS policies)
-- ----------------------------------------------------------------------------

-- Check if authenticated user is an active member of a specific business
CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.business_members bm
        WHERE bm.business_id = target_business_id
          AND bm.user_id = auth.uid()
          AND bm.is_active = true
    );
$$;

-- Check if authenticated user has one of the specified roles in a business
CREATE OR REPLACE FUNCTION public.has_business_role(target_business_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.business_members bm
        WHERE bm.business_id = target_business_id
          AND bm.user_id = auth.uid()
          AND bm.is_active = true
          AND bm.role = ANY(allowed_roles)
    );
$$;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) FOR CORE TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view all active profiles in their business, update their own
CREATE POLICY "Users can view profiles within shared businesses"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.business_members my_bm
            JOIN public.business_members other_bm ON my_bm.business_id = other_bm.business_id
            WHERE my_bm.user_id = auth.uid()
              AND other_bm.user_id = profiles.id
              AND my_bm.is_active = true
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Businesses: Members can view their own business; only owners/admins can update
CREATE POLICY "Members can view their business"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (public.is_business_member(id));

CREATE POLICY "Owners and Admins can update business settings"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (public.has_business_role(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_business_role(id, ARRAY['owner', 'admin']));

-- Business Members: Members can view colleagues; owners/admins can manage memberships
CREATE POLICY "Members can view membership in their business"
    ON public.business_members FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners and Admins can manage business members"
    ON public.business_members FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin']));

-- ----------------------------------------------------------------------------
-- 6. AUTOMATIC PROFILE CREATION TRIGGER (ON auth.users INSERT)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
