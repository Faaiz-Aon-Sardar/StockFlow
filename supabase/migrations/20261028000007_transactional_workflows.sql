-- ============================================================================
-- Migration: 20261028000007_transactional_workflows.sql
-- Description: Core transactional workflows, atomic stored procedures,
--              concurrency controls, idempotency guards, and financial rules.
-- ============================================================================

-- 1. Extend businesses table with stock deduction policy
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stock_deduction_policy TEXT NOT NULL DEFAULT 'on_dispatch'
    CHECK (stock_deduction_policy IN ('on_dispatch', 'on_confirmation'));

-- 2. Add idempotency keys to dispatches and payments to prevent duplicate submissions
ALTER TABLE public.dispatches
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatches_idempotency
ON public.dispatches(business_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency
ON public.payments(business_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 3. Supplier Purchase Payment Allocations (Linking payments to supplier POs)
CREATE TABLE IF NOT EXISTS public.purchase_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE RESTRICT,
    amount_allocated NUMERIC(15, 2) NOT NULL CHECK (amount_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payment_purchase_allocation UNIQUE (payment_id, purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_allocations_purchase
ON public.purchase_payment_allocations(purchase_id);

ALTER TABLE public.purchase_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view purchase allocations"
    ON public.purchase_payment_allocations FOR SELECT
    TO authenticated
    USING (public.is_business_member(business_id));

CREATE POLICY "Authorized roles can manage purchase allocations"
    ON public.purchase_payment_allocations FOR ALL
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']))
    WITH CHECK (public.has_business_role(business_id, ARRAY['owner', 'admin', 'accounts']));

-- ----------------------------------------------------------------------------
-- 4. ATOMIC DISPATCH WORKFLOW (Safe under concurrency, stock validation)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_dispatch(
    p_business_id UUID,
    p_order_id UUID,
    p_carrier_name TEXT,
    p_vehicle_no TEXT,
    p_items JSONB, -- Array of { "product_id": "...", "quantity_dispatched": 5 }
    p_idempotency_key TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_policy TEXT;
    v_dispatch_number TEXT;
    v_dispatch_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_qty_to_disp NUMERIC(12, 4);
    v_order_item RECORD;
    v_current_stock NUMERIC(12, 4);
    v_already_dispatched NUMERIC(12, 4);
    v_new_stock NUMERIC(12, 4);
    v_total_order_qty NUMERIC(12, 4) := 0;
    v_total_dispatched_qty NUMERIC(12, 4) := 0;
    v_all_dispatched BOOLEAN := TRUE;
BEGIN
    -- Idempotency check: if already processed with this key, return existing record
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, dispatch_number INTO v_dispatch_id, v_dispatch_number
        FROM public.dispatches
        WHERE business_id = p_business_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'dispatch_id', v_dispatch_id,
                'dispatch_number', v_dispatch_number
            );
        END IF;
    END IF;

    -- 1. Lock the sales order row
    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales order % not found in business %', p_order_id, p_business_id;
    END IF;

    IF v_order.status IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot dispatch an order with status "%"', v_order.status;
    END IF;

    -- 2. Get business stock deduction policy
    SELECT stock_deduction_policy INTO v_policy
    FROM public.businesses
    WHERE id = p_business_id;

    -- 3. Acquire consecutive dispatch number
    v_dispatch_number := public.get_next_document_number(p_business_id, 'dispatch');
    v_dispatch_id := gen_random_uuid();

    -- 4. Create dispatch header
    INSERT INTO public.dispatches (
        id,
        business_id,
        dispatch_number,
        order_id,
        customer_id,
        dispatch_date,
        carrier_name,
        vehicle_or_tracking_no,
        shipping_address,
        status,
        idempotency_key,
        dispatched_by
    ) VALUES (
        v_dispatch_id,
        p_business_id,
        v_dispatch_number,
        p_order_id,
        v_order.customer_id,
        CURRENT_DATE,
        p_carrier_name,
        p_vehicle_no,
        'As per customer profile',
        'packed',
        p_idempotency_key,
        p_user_id
    );

    -- 5. Process each dispatch line with stock verification and row locks
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty_to_disp := (v_item->>'quantity_dispatched')::NUMERIC(12, 4);

        IF v_qty_to_disp <= 0 THEN
            RAISE EXCEPTION 'Dispatch quantity must be strictly positive';
        END IF;

        -- Lock the product row to serialize concurrent dispatches
        PERFORM 1 FROM public.products
        WHERE id = v_product_id AND business_id = p_business_id
        FOR UPDATE;

        -- Find the corresponding sales order item
        SELECT * INTO v_order_item
        FROM public.sales_order_items
        WHERE order_id = p_order_id AND product_id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % is not part of sales order %', v_product_id, v_order.order_number;
        END IF;

        -- Calculate quantity already dispatched for this order item
        SELECT COALESCE(SUM(di.quantity_dispatched), 0.0000) INTO v_already_dispatched
        FROM public.dispatch_items di
        JOIN public.dispatches d ON d.id = di.dispatch_id
        WHERE d.order_id = p_order_id AND di.product_id = v_product_id;

        IF (v_already_dispatched + v_qty_to_disp) > v_order_item.quantity THEN
            RAISE EXCEPTION 'Cannot dispatch % units of %. Ordered: %, Already dispatched: %',
                v_qty_to_disp, v_order_item.product_name, v_order_item.quantity, v_already_dispatched;
        END IF;

        -- Compute live physical stock balance
        SELECT COALESCE(SUM(change_qty), 0.0000) INTO v_current_stock
        FROM public.stock_movements
        WHERE business_id = p_business_id AND product_id = v_product_id;

        IF v_current_stock < v_qty_to_disp THEN
            RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
                v_order_item.product_name, v_current_stock, v_qty_to_disp;
        END IF;

        v_new_stock := v_current_stock - v_qty_to_disp;

        -- Insert dispatch item record
        INSERT INTO public.dispatch_items (
            dispatch_id,
            order_item_id,
            product_id,
            quantity_dispatched
        ) VALUES (
            v_dispatch_id,
            v_order_item.id,
            v_product_id,
            v_qty_to_disp
        );

        -- Record permanent physical deduction in stock movements ledger
        INSERT INTO public.stock_movements (
            business_id,
            product_id,
            movement_type,
            change_qty,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            reference_type,
            reference_uuid,
            performed_by
        ) VALUES (
            p_business_id,
            v_product_id,
            'dispatch',
            -v_qty_to_disp,
            v_current_stock,
            v_new_stock,
            'Fulfillment for order: ' || v_order.order_number,
            v_dispatch_number,
            'dispatch',
            v_dispatch_id,
            p_user_id
        );
    END LOOP;

    -- 6. Evaluate total order progress across all items
    SELECT 
        COALESCE(SUM(soi.quantity), 0.0000),
        COALESCE(SUM(di.quantity_dispatched), 0.0000)
    INTO v_total_order_qty, v_total_dispatched_qty
    FROM public.sales_order_items soi
    LEFT JOIN public.dispatches d ON d.order_id = soi.order_id
    LEFT JOIN public.dispatch_items di ON di.dispatch_id = d.id AND di.order_item_id = soi.id
    WHERE soi.order_id = p_order_id;

    -- Update order status
    UPDATE public.sales_orders
    SET 
        status = CASE 
            WHEN v_total_dispatched_qty >= v_total_order_qty THEN 'dispatched'
            ELSE 'partially_dispatched'
        END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'dispatch_id', v_dispatch_id,
        'dispatch_number', v_dispatch_number,
        'order_status', CASE WHEN v_total_dispatched_qty >= v_total_order_qty THEN 'dispatched' ELSE 'partially_dispatched' END
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. ATOMIC ORDER CANCELLATION WORKFLOW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_order_cancellation(
    p_business_id UUID,
    p_order_id UUID,
    p_reason TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_dispatched_count INTEGER;
BEGIN
    SELECT * INTO v_order
    FROM public.sales_orders
    WHERE id = p_order_id AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order already cancelled');
    END IF;

    -- Check if any dispatches exist
    SELECT COUNT(*) INTO v_dispatched_count
    FROM public.dispatches
    WHERE order_id = p_order_id;

    IF v_dispatched_count > 0 THEN
        RAISE EXCEPTION 'Cannot cancel an order with existing fulfillment dispatches. Process a customer return instead.';
    END IF;

    -- Mark order cancelled
    UPDATE public.sales_orders
    SET 
        status = 'cancelled',
        notes = COALESCE(notes || ' | ', '') || 'Cancelled: ' || p_reason,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- If business policy was on_confirmation, record reservation release in audit
    INSERT INTO public.audit_logs (
        business_id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        p_business_id,
        'sales_orders',
        p_order_id,
        'STATUS_CHANGE',
        jsonb_build_object('status', v_order.status),
        jsonb_build_object('status', 'cancelled', 'reason', p_reason),
        p_user_id
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'cancelled');
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC PAYMENT WITH MULTI-INVOICE ALLOCATIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_payment_with_allocations(
    p_business_id UUID,
    p_party_type TEXT,
    p_party_id UUID,
    p_amount NUMERIC(15, 2),
    p_method TEXT,
    p_ref_no TEXT,
    p_allocations JSONB, -- Array of { "invoice_id": "...", "amount_allocated": 1000 }
    p_idempotency_key TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_number TEXT;
    v_payment_id UUID;
    v_alloc JSONB;
    v_invoice_id UUID;
    v_alloc_amount NUMERIC(15, 2);
    v_total_allocated NUMERIC(15, 2) := 0;
    v_invoice RECORD;
    v_already_paid NUMERIC(15, 2);
BEGIN
    -- 1. Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, payment_number INTO v_payment_id, v_payment_number
        FROM public.payments
        WHERE business_id = p_business_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'payment_id', v_payment_id,
                'payment_number', v_payment_number
            );
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    -- 2. Verify total allocated <= payment amount
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            v_alloc_amount := (v_alloc->>'amount_allocated')::NUMERIC(15, 2);
            IF v_alloc_amount <= 0 THEN
                RAISE EXCEPTION 'Allocation amount must be greater than zero.';
            END IF;
            v_total_allocated := v_total_allocated + v_alloc_amount;
        END LOOP;

        IF v_total_allocated > (p_amount + 0.01) THEN
            RAISE EXCEPTION 'Total allocated (%) exceeds payment amount (%).', v_total_allocated, p_amount;
        END IF;
    END IF;

    -- 3. Acquire consecutive payment number
    v_payment_number := public.get_next_document_number(p_business_id, 'payment');
    v_payment_id := gen_random_uuid();

    -- 4. Create payment master record
    INSERT INTO public.payments (
        id,
        business_id,
        payment_number,
        payment_date,
        party_type,
        party_id,
        amount,
        payment_method,
        reference_no,
        idempotency_key,
        created_by
    ) VALUES (
        v_payment_id,
        p_business_id,
        v_payment_number,
        CURRENT_DATE,
        p_party_type,
        p_party_id,
        p_amount,
        p_method,
        p_ref_no,
        p_idempotency_key,
        p_user_id
    );

    -- 5. Process allocations with row-locks on invoices
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
        LOOP
            v_invoice_id := (v_alloc->>'invoice_id')::UUID;
            v_alloc_amount := (v_alloc->>'amount_allocated')::NUMERIC(15, 2);

            -- Lock the invoice row
            SELECT * INTO v_invoice
            FROM public.invoices
            WHERE id = v_invoice_id AND business_id = p_business_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Invoice % not found in business %', v_invoice_id, p_business_id;
            END IF;

            IF v_invoice.status = 'cancelled' THEN
                RAISE EXCEPTION 'Cannot allocate payment to cancelled invoice %', v_invoice.invoice_number;
            END IF;

            -- Check already paid
            SELECT COALESCE(SUM(amount_allocated), 0.00) INTO v_already_paid
            FROM public.payment_allocations
            WHERE invoice_id = v_invoice_id;

            IF (v_already_paid + v_alloc_amount) > (v_invoice.grand_total + 0.01) THEN
                RAISE EXCEPTION 'Allocation of % to invoice % exceeds remaining balance of %',
                    v_alloc_amount, v_invoice.invoice_number, (v_invoice.grand_total - v_already_paid);
            END IF;

            -- Insert allocation junction
            INSERT INTO public.payment_allocations (
                business_id,
                payment_id,
                invoice_id,
                amount_allocated
            ) VALUES (
                p_business_id,
                v_payment_id,
                v_invoice_id,
                v_alloc_amount
            );

            -- Update invoice status if fully settled
            IF (v_already_paid + v_alloc_amount) >= (v_invoice.grand_total - 0.01) THEN
                UPDATE public.invoices
                SET status = 'paid', updated_at = timezone('utc'::text, now())
                WHERE id = v_invoice_id;
            ELSE
                UPDATE public.invoices
                SET status = 'partially_paid', updated_at = timezone('utc'::text, now())
                WHERE id = v_invoice_id;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'payment_number', v_payment_number,
        'total_allocated', v_total_allocated
    );
END;
$$;
