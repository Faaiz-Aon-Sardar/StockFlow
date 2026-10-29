-- ============================================================================
-- Migration: 20261028000005_invoices_and_payments.sql
-- Description: Invoices, immutable line items, payments, multi-invoice allocations,
--              derived financial balance views, anti-overpayment validation, and RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INVOICES (GST Tax Invoices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    billing_address TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    customer_gstin VARCHAR(15),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (discount_total >= 0),
    tax_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    tax_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    status TEXT NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_invoice_number UNIQUE (business_id, invoice_number)
);

CREATE INDEX idx_invoices_business ON public.invoices(business_id);
CREATE INDEX idx_invoices_customer ON public.invoices(business_id, customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(business_id, status);
CREATE INDEX idx_invoices_due_date ON public.invoices(business_id, due_date);

-- ----------------------------------------------------------------------------
-- 2. INVOICE ITEMS (Snapshot of issued line items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,
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

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON public.invoice_items(product_id);

-- ----------------------------------------------------------------------------
-- 3. PAYMENTS (Receipts from customers or disbursements to suppliers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque')),
    reference_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_payment_number UNIQUE (business_id, payment_number)
);

CREATE INDEX idx_payments_business ON public.payments(business_id);
CREATE INDEX idx_payments_party ON public.payments(business_id, party_id);
CREATE INDEX idx_payments_date ON public.payments(business_id, payment_date DESC);

-- ----------------------------------------------------------------------------
-- 4. PAYMENT ALLOCATIONS (Explicit junction linking payments to invoices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    amount_allocated NUMERIC(15, 2) NOT NULL CHECK (amount_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payment_invoice_allocation UNIQUE (payment_id, invoice_id)
);

CREATE INDEX idx_allocations_business ON public.payment_allocations(business_id);
CREATE INDEX idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX idx_allocations_invoice ON public.payment_allocations(invoice_id);

-- ----------------------------------------------------------------------------
-- 5. DERIVED BALANCE VIEWS (Strictly calculated, non-editable balances)
-- ----------------------------------------------------------------------------

-- Invoices with dynamic calculated payments and balances due
CREATE OR REPLACE VIEW public.v_invoice_balances AS
SELECT 
    i.id AS invoice_id,
    i.business_id,
    i.invoice_number,
    i.customer_id,
    i.issue_date,
    i.due_date,
    i.status,
    i.grand_total,
    COALESCE(SUM(pa.amount_allocated), 0.00)::NUMERIC(15, 2) AS total_paid,
    (i.grand_total - COALESCE(SUM(pa.amount_allocated), 0.00))::NUMERIC(15, 2) AS balance_due,
    CASE 
        WHEN i.status = 'cancelled' THEN 'cancelled'
        WHEN (i.grand_total - COALESCE(SUM(pa.amount_allocated), 0.00)) <= 0.01 THEN 'paid'
        WHEN COALESCE(SUM(pa.amount_allocated), 0.00) > 0 THEN 'partially_paid'
        WHEN CURRENT_DATE > i.due_date THEN 'overdue'
        ELSE i.status
    END AS computed_status
FROM public.invoices i
LEFT JOIN public.payment_allocations pa ON pa.invoice_id = i.id
GROUP BY i.id;

-- Commercial Parties with accurate, derived outstanding balances
CREATE OR REPLACE VIEW public.v_party_balances AS
SELECT 
    p.id AS party_id,
    p.business_id,
    p.code,
    p.name,
    p.party_type,
    p.credit_limit,
    p.opening_balance,
    -- Customer Outstanding = Opening balance + Unpaid Invoice Dues
    (p.opening_balance + COALESCE(inv_agg.total_invoice_balance, 0.00))::NUMERIC(15, 2) AS current_outstanding
FROM public.parties p
LEFT JOIN (
    SELECT 
        customer_id, 
        SUM(balance_due) AS total_invoice_balance
    FROM public.v_invoice_balances
    WHERE status != 'cancelled'
    GROUP BY customer_id
) inv_agg ON inv_agg.customer_id = p.id;

-- ----------------------------------------------------------------------------
-- 6. ALLOCATION INTEGRITY VALIDATION TRIGGER
-- ----------------------------------------------------------------------------
-- Ensures payments cannot be over-allocated beyond payment amount or invoice balance
CREATE OR REPLACE FUNCTION public.validate_payment_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_amount NUMERIC(15, 2);
    v_total_allocated NUMERIC(15, 2);
    v_invoice_total NUMERIC(15, 2);
    v_already_paid NUMERIC(15, 2);
BEGIN
    -- Check payment total cap
    SELECT amount INTO v_payment_amount
    FROM public.payments
    WHERE id = NEW.payment_id;

    SELECT COALESCE(SUM(amount_allocated), 0.00) INTO v_total_allocated
    FROM public.payment_allocations
    WHERE payment_id = NEW.payment_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_total_allocated + NEW.amount_allocated) > v_payment_amount THEN
        RAISE EXCEPTION 'Total allocated (%) cannot exceed payment amount (%)',
            (v_total_allocated + NEW.amount_allocated), v_payment_amount;
    END IF;

    -- Check invoice balance cap
    SELECT grand_total INTO v_invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    SELECT COALESCE(SUM(amount_allocated), 0.00) INTO v_already_paid
    FROM public.payment_allocations
    WHERE invoice_id = NEW.invoice_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    IF (v_already_paid + NEW.amount_allocated) > v_invoice_total THEN
        RAISE EXCEPTION 'Allocation (%) exceeds remaining invoice balance (%)',
            NEW.amount_allocated, (v_invoice_total - v_already_paid);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_allocation ON public.payment_allocations;
CREATE TRIGGER trg_validate_payment_allocation
    BEFORE INSERT OR UPDATE ON public.payment_allocations
    FOR EACH ROW EXECUTE FUNCTION public.validate_payment_allocation();

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Members can view invoices in their business"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts', 'sales']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts', 'sales']));

-- Invoice items policies
CREATE POLICY "Members can view invoice items"
    ON public.invoice_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_items.invoice_id
          AND public.is_business_member(i.business_id)
    ));

CREATE POLICY "Authorized roles can manage invoice items"
    ON public.invoice_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_items.invoice_id
          AND public.has_business_role(i.business_id, ARRAY['owner', 'admin', 'accounts', 'sales'])
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = invoice_items.invoice_id
          AND public.has_business_role(i.business_id, ARRAY['owner', 'admin', 'accounts', 'sales'])
    ));

-- Payments policies
CREATE POLICY "Members can view payments in their business"
    ON public.payments FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can record payments"
    ON public.payments FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']));

-- Payment allocations policies
CREATE POLICY "Members can view payment allocations"
    ON public.payment_allocations FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage payment allocations"
    ON public.payment_allocations FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']));
