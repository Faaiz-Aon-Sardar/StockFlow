-- ============================================================================
-- Migration: 20261028000006_audit_and_triggers.sql
-- Description: Audit logging infrastructure, automated audit trail triggers,
--              and strict immutability locks for issued invoices.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_logs_business ON public.audit_logs(business_id);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_date ON public.audit_logs(business_id, created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Immutable compliance audit log capturing state transitions and financial record edits.';

-- ----------------------------------------------------------------------------
-- 2. AUTOMATED AUDIT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business_id UUID;
    v_record_id UUID;
    v_action TEXT;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_business_id := NEW.business_id;
        v_record_id := NEW.id;
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := CASE 
            WHEN (OLD.status IS DISTINCT FROM NEW.status) THEN 'STATUS_CHANGE'
            ELSE 'UPDATE'
        END;
        v_business_id := NEW.business_id;
        v_record_id := NEW.id;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_business_id := OLD.business_id;
        v_record_id := OLD.id;
        v_old := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (
        business_id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        v_business_id,
        TG_TABLE_NAME,
        v_record_id,
        v_action,
        v_old,
        v_new,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers to financial and inventory tables
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

DROP TRIGGER IF EXISTS trg_audit_purchases ON public.purchases;
CREATE TRIGGER trg_audit_purchases
    AFTER INSERT OR UPDATE OR DELETE ON public.purchases
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

-- ----------------------------------------------------------------------------
-- 3. ISSUED INVOICE IMMUTABILITY LOCK
-- ----------------------------------------------------------------------------
-- Strictly enforces Domain Rule 5: Issued invoices cannot be silently edited.
-- Only status cancellation or payment-related transitions are allowed.
CREATE OR REPLACE FUNCTION public.enforce_invoice_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Prevent modifying line items of issued invoices
    IF TG_TABLE_NAME = 'invoice_items' THEN
        IF EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = OLD.invoice_id AND status != 'draft'
        ) THEN
            RAISE EXCEPTION 'Cannot modify or delete items of an already issued tax invoice.';
        END IF;
    END IF;

    -- Prevent modifying core fields of issued invoices
    IF TG_TABLE_NAME = 'invoices' THEN
        IF OLD.status != 'draft' THEN
            -- Check if financial headers were altered
            IF (OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
                OLD.tax_total IS DISTINCT FROM NEW.tax_total OR
                OLD.grand_total IS DISTINCT FROM NEW.grand_total OR
                OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
                OLD.invoice_number IS DISTINCT FROM NEW.invoice_number) THEN
                RAISE EXCEPTION 'Core financial details of an issued invoice are immutable. Issue a credit note or cancel with audit trail instead.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_immutability ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_immutability
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_immutability();

DROP TRIGGER IF EXISTS trg_enforce_invoice_items_immutability ON public.invoice_items;
CREATE TRIGGER trg_enforce_invoice_items_immutability
    BEFORE UPDATE OR DELETE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_immutability();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policies: Read-only for Owners and Admins; strictly no manual insert/update/delete from clients
CREATE POLICY "Owners and Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.has_business_role(business_id, ARRAY['owner', 'admin']));

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are append-only system records and cannot be altered or removed.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
