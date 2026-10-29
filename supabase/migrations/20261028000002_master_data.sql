-- ============================================================================
-- Migration: 20261028000002_master_data.sql
-- Description: Master catalog data: products, tiered pricing, and unified parties
--              (customers, suppliers, or dual-role commercial partners).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRODUCTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    uom TEXT NOT NULL CHECK (uom IN ('pcs', 'box', 'crate', 'kg', 'ltr', 'bag', 'carton')),
    purchase_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    default_selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (default_selling_price >= 0),
    reorder_level NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (reorder_level >= 0),
    hsn_code VARCHAR(8),
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (gst_rate IN (0, 0.1, 0.25, 3, 5, 12, 18, 28)),
    wholesale_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_product_sku UNIQUE (business_id, sku)
);

CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_status ON public.products(business_id, status);
CREATE INDEX idx_products_category ON public.products(business_id, category);

COMMENT ON TABLE public.products IS 'Wholesale inventory products and pricing configurations.';

-- ----------------------------------------------------------------------------
-- 2. PARTIES (Unified Customers and Suppliers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier', 'both')),
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    gstin VARCHAR(15),
    pan_number VARCHAR(10),
    payment_terms TEXT NOT NULL DEFAULT 'net_15' 
        CHECK (payment_terms IN ('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60')),
    credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_party_code UNIQUE (business_id, code),
    CONSTRAINT chk_party_gstin CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

CREATE INDEX idx_parties_business ON public.parties(business_id);
CREATE INDEX idx_parties_type ON public.parties(business_id, party_type);
CREATE INDEX idx_parties_status ON public.parties(business_id, status);

COMMENT ON TABLE public.parties IS 'Commercial partners: Kirana customers, retail stores, wholesale suppliers, and depots.';

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR MASTER DATA
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Products Policies
CREATE POLICY "Members can view products in their business"
    ON public.products FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage products"
    ON public.products FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store']));

-- Parties Policies
CREATE POLICY "Members can view parties in their business"
    ON public.parties FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can insert and update parties"
    ON public.parties FOR INSERT
    TO authenticated
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'sales', 'accounts']));

CREATE POLICY "Authorized roles can update parties"
    ON public.parties FOR UPDATE
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'sales', 'accounts']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'sales', 'accounts']));

CREATE POLICY "Only Owners and Admins can delete parties"
    ON public.parties FOR DELETE
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));
