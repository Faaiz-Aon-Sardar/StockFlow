-- ============================================================================
-- Migration: 20261028000003_orders_and_dispatches.sql
-- Description: Sales orders, line items, fulfillment dispatches, delivery tracking,
--              concurrency-safe document sequence generator, and RLS.
-- ============================================================================

-- Document numbering sequence table to guarantee concurrency-safe, gap-free, unique numbers
CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('order', 'dispatch', 'invoice', 'payment', 'purchase')),
    prefix TEXT NOT NULL,
    year INTEGER NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_doc_seq UNIQUE (business_id, document_type, year)
);

CREATE INDEX idx_document_sequences_lookup ON public.document_sequences(business_id, document_type, year);

-- Concurrency-safe function to acquire the next sequence number under row lock
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_business_id UUID,
    p_doc_type TEXT,
    p_prefix TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_seq_record RECORD;
    v_next_val BIGINT;
    v_prefix TEXT;
    v_formatted TEXT;
BEGIN
    -- Determine default prefix from business settings if not provided
    IF p_prefix IS NULL THEN
        SELECT 
            CASE p_doc_type
                WHEN 'order' THEN order_prefix
                WHEN 'dispatch' THEN dispatch_prefix
                WHEN 'invoice' THEN invoice_prefix
                WHEN 'payment' THEN payment_prefix
                WHEN 'purchase' THEN purchase_prefix
                ELSE 'DOC-'
            END INTO v_prefix
        FROM public.businesses
        WHERE id = p_business_id;
    ELSE
        v_prefix := p_prefix;
    END IF;

    -- Upsert and lock sequence row
    INSERT INTO public.document_sequences (business_id, document_type, prefix, year, current_value)
    VALUES (p_business_id, p_doc_type, v_prefix, v_year, 1)
    ON CONFLICT (business_id, document_type, year)
    DO UPDATE SET 
        current_value = public.document_sequences.current_value + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING current_value INTO v_next_val;

    -- Format e.g. SO-2026-0001
    v_formatted := v_prefix || v_year || '-' || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_formatted;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. SALES ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'confirmed', 'partially_dispatched', 'dispatched', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' 
        CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_order_number UNIQUE (business_id, order_number)
);

CREATE INDEX idx_sales_orders_business ON public.sales_orders(business_id);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(business_id, customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(business_id, status);
CREATE INDEX idx_sales_orders_date ON public.sales_orders(business_id, order_date DESC);

-- ----------------------------------------------------------------------------
-- 2. SALES ORDER ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    uom TEXT NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    hsn_code VARCHAR(8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_product ON public.sales_order_items(product_id);

-- ----------------------------------------------------------------------------
-- 3. DISPATCHES (Delivery fulfillment)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    dispatch_number TEXT NOT NULL,
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    carrier_name TEXT NOT NULL,
    vehicle_or_tracking_no TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'packed' CHECK (status IN ('packed', 'in_transit', 'delivered')),
    notes TEXT,
    dispatched_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_dispatch_number UNIQUE (business_id, dispatch_number)
);

CREATE INDEX idx_dispatches_business ON public.dispatches(business_id);
CREATE INDEX idx_dispatches_order ON public.dispatches(order_id);
CREATE INDEX idx_dispatches_customer ON public.dispatches(customer_id);

-- ----------------------------------------------------------------------------
-- 4. DISPATCH ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_dispatched NUMERIC(12, 4) NOT NULL CHECK (quantity_dispatched > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_dispatch_items_dispatch ON public.dispatch_items(dispatch_id);
CREATE INDEX idx_dispatch_items_product ON public.dispatch_items(product_id);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

-- Document sequences policy
CREATE POLICY "Members can view sequences"
    ON public.document_sequences FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

-- Sales Orders policies
CREATE POLICY "Members can view sales orders in their business"
    ON public.sales_orders FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage sales orders"
    ON public.sales_orders FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'sales']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'sales']));

-- Sales Order Items policies (cascaded via parent sales order)
CREATE POLICY "Members can view order items"
    ON public.sales_order_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sales_orders so
        WHERE so.id = sales_order_items.order_id
          AND public.is_business_member(so.business_id)
    ));

CREATE POLICY "Authorized roles can manage order items"
    ON public.sales_order_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sales_orders so
        WHERE so.id = sales_order_items.order_id
          AND public.has_business_role(so.business_id, ARRAY['owner', 'admin', 'sales'])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sales_orders so
        WHERE so.id = sales_order_items.order_id
          AND public.has_business_role(so.business_id, ARRAY['owner', 'admin', 'sales'])
    ));

-- Dispatches policies
CREATE POLICY "Members can view dispatches in their business"
    ON public.dispatches FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage dispatches"
    ON public.dispatches FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store']));

-- Dispatch items policies
CREATE POLICY "Members can view dispatch items"
    ON public.dispatch_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dispatches d
        WHERE d.id = dispatch_items.dispatch_id
          AND public.is_business_member(d.business_id)
    ));

CREATE POLICY "Authorized roles can manage dispatch items"
    ON public.dispatch_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dispatches d
        WHERE d.id = dispatch_items.dispatch_id
          AND public.has_business_role(d.business_id, ARRAY['owner', 'admin', 'store'])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.dispatches d
        WHERE d.id = dispatch_items.dispatch_id
          AND public.has_business_role(d.business_id, ARRAY['owner', 'admin', 'store'])
    ));
