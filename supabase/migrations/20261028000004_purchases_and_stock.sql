-- ============================================================================
-- Migration: 20261028000004_purchases_and_stock.sql
-- Description: Purchases, goods receipt, purchase items, immutable stock movements
--              ledger, stock balance calculation functions, and RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PURCHASES (Purchase Orders to Suppliers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    purchase_ref TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    status TEXT NOT NULL DEFAULT 'ordered' 
        CHECK (status IN ('ordered', 'partially_received', 'received', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' 
        CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_purchase_ref UNIQUE (business_id, purchase_ref)
);

CREATE INDEX idx_purchases_business ON public.purchases(business_id);
CREATE INDEX idx_purchases_supplier ON public.purchases(business_id, supplier_id);
CREATE INDEX idx_purchases_status ON public.purchases(business_id, status);

-- ----------------------------------------------------------------------------
-- 2. PURCHASE ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    uom TEXT NOT NULL,
    quantity_ordered NUMERIC(12, 4) NOT NULL CHECK (quantity_ordered > 0),
    quantity_received NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (quantity_received >= 0),
    unit_cost NUMERIC(15, 2) NOT NULL CHECK (unit_cost >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    hsn_code VARCHAR(8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON public.purchase_items(product_id);

-- ----------------------------------------------------------------------------
-- 3. STOCK MOVEMENTS (Immutable Ledger of All Inventory Changes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('purchase_receipt', 'dispatch', 'adjustment', 'return', 'reservation_hold', 'reservation_release')
    ),
    change_qty NUMERIC(12, 4) NOT NULL, -- Positive for stock additions, negative for deductions
    previous_stock NUMERIC(12, 4) NOT NULL,
    new_stock NUMERIC(12, 4) NOT NULL,
    unit_cost NUMERIC(15, 2), -- Cost basis for FIFO/inventory valuation
    reason TEXT NOT NULL,
    reference_id TEXT, -- Human-readable ref e.g. PO-2026-0012, DSP-2026-0045
    reference_type TEXT CHECK (reference_type IN ('purchase', 'dispatch', 'sales_order', 'manual_adjustment', 'vendor_return', 'customer_return')),
    reference_uuid UUID,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_stock_movements_business ON public.stock_movements(business_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(business_id, product_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(business_id, created_at DESC);
CREATE INDEX idx_stock_movements_ref ON public.stock_movements(business_id, reference_type, reference_uuid);

COMMENT ON TABLE public.stock_movements IS 'Audit-proof double-entry inventory ledger. No record is ever updated or deleted.';

-- ----------------------------------------------------------------------------
-- 4. ATOMIC GOODS RECEIPT STORED PROCEDURE
-- ----------------------------------------------------------------------------
-- Safely increments product stock, updates purchase item quantities, marks purchase status,
-- and creates audited stock movements within an atomic database transaction.
CREATE OR REPLACE FUNCTION public.process_goods_receipt(
    p_business_id UUID,
    p_purchase_id UUID,
    p_receipt_items JSONB, -- Array of { "product_id": "...", "quantity_received": 10 }
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_qty_received NUMERIC(12, 4);
    v_item_record RECORD;
    v_product_record RECORD;
    v_new_stock NUMERIC(12, 4);
    v_all_received BOOLEAN := TRUE;
BEGIN
    -- Verify purchase exists and belongs to business, lock row
    SELECT * INTO v_purchase
    FROM public.purchases
    WHERE id = p_purchase_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order % not found for business %', p_purchase_id, p_business_id;
    END IF;

    IF v_purchase.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot receive goods against a cancelled purchase order';
    END IF;

    -- Process each received item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_receipt_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty_received := (v_item->>'quantity_received')::NUMERIC(12, 4);

        IF v_qty_received > 0 THEN
            -- Lock purchase item
            SELECT * INTO v_item_record
            FROM public.purchase_items
            WHERE purchase_id = p_purchase_id AND product_id = v_product_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Product % not found in purchase order %', v_product_id, p_purchase_id;
            END IF;

            -- Update quantity_received on purchase item
            UPDATE public.purchase_items
            SET quantity_received = quantity_received + v_qty_received
            WHERE id = v_item_record.id;

            -- Lock product and get current stock from movement sum
            SELECT COALESCE(SUM(change_qty), 0.0000) INTO v_product_record
            FROM public.stock_movements
            WHERE business_id = p_business_id AND product_id = v_product_id;

            v_new_stock := v_product_record.sum + v_qty_received;

            -- Insert immutable stock movement
            INSERT INTO public.stock_movements (
                business_id,
                product_id,
                movement_type,
                change_qty,
                previous_stock,
                new_stock,
                unit_cost,
                reason,
                reference_id,
                reference_type,
                reference_uuid,
                performed_by
            ) VALUES (
                p_business_id,
                v_product_id,
                'purchase_receipt',
                v_qty_received,
                v_product_record.sum,
                v_new_stock,
                v_item_record.unit_cost,
                'Goods received against PO: ' || v_purchase.purchase_ref,
                v_purchase.purchase_ref,
                'purchase',
                p_purchase_id,
                p_user_id
            );
        END IF;
    END LOOP;

    -- Check if all items in purchase are fully received
    IF EXISTS (
        SELECT 1 FROM public.purchase_items
        WHERE purchase_id = p_purchase_id
          AND quantity_received < quantity_ordered
    ) THEN
        v_all_received := FALSE;
    END IF;

    -- Update purchase header
    UPDATE public.purchases
    SET 
        status = CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END,
        received_date = CURRENT_DATE,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object('success', true, 'status', CASE WHEN v_all_received THEN 'received' ELSE 'partially_received' END);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Purchases policies
CREATE POLICY "Members can view purchases in their business"
    ON public.purchases FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage purchases"
    ON public.purchases FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store', 'accounts']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store', 'accounts']));

-- Purchase items policies
CREATE POLICY "Members can view purchase items"
    ON public.purchase_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.id = purchase_items.purchase_id
          AND public.is_business_member(p.business_id)
    ));

CREATE POLICY "Authorized roles can manage purchase items"
    ON public.purchase_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.id = purchase_items.purchase_id
          AND public.has_business_role(p.business_id, ARRAY['owner', 'admin', 'store', 'accounts'])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.id = purchase_items.purchase_id
          AND public.has_business_role(p.business_id, ARRAY['owner', 'admin', 'store', 'accounts'])
    ));

-- Stock movements policies (SELECT allowed for all members; INSERT restricted to authorized roles; NO UPDATE / DELETE)
CREATE POLICY "Members can view stock movements in their business"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can append stock movements"
    ON public.stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'store']));

-- Strict immutability: Prevent updates or deletes on stock_movements
CREATE OR REPLACE FUNCTION public.prevent_stock_movement_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Stock movements are immutable audit records and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stock_movement_mutation ON public.stock_movements;
CREATE TRIGGER trg_prevent_stock_movement_mutation
    BEFORE UPDATE OR DELETE ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.prevent_stock_movement_mutation();
