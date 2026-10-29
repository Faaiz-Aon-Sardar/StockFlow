-- ============================================================================
-- Migration 008: Business Onboarding & First-Time Setup
-- Allows authenticated users to create a tenant business and atomically become its Owner.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_business_with_owner(
    p_name TEXT,
    p_trade_name TEXT DEFAULT NULL,
    p_gstin TEXT DEFAULT NULL,
    p_address TEXT DEFAULT 'Main Market, Wholesale Complex',
    p_state TEXT DEFAULT 'Maharashtra',
    p_state_code TEXT DEFAULT '27',
    p_currency_code TEXT DEFAULT 'INR'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_business_id UUID;
    v_business RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Create Business
    INSERT INTO public.businesses (
        name,
        trade_name,
        gstin,
        address,
        state,
        state_code,
        currency_code,
        currency_symbol,
        created_at,
        updated_at
    )
    VALUES (
        p_name,
        COALESCE(p_trade_name, p_name),
        p_gstin,
        COALESCE(p_address, 'Main Market, Wholesale Complex'),
        COALESCE(p_state, 'Maharashtra'),
        COALESCE(p_state_code, '27'),
        COALESCE(p_currency_code, 'INR'),
        '₹',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_business_id;

    -- 2. Add creator as Owner in business_members
    INSERT INTO public.business_members (
        business_id,
        user_id,
        role,
        department,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        v_business_id,
        v_user_id,
        'owner',
        'Executive Management',
        true,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    );

    -- 3. Initialize default document sequences for this year
    INSERT INTO public.document_sequences (business_id, document_type, prefix, year, current_value)
    VALUES
        (v_business_id, 'order', 'SO', EXTRACT(YEAR FROM CURRENT_DATE), 100),
        (v_business_id, 'invoice', 'INV', EXTRACT(YEAR FROM CURRENT_DATE), 100),
        (v_business_id, 'dispatch', 'DSP', EXTRACT(YEAR FROM CURRENT_DATE), 100),
        (v_business_id, 'purchase', 'PO', EXTRACT(YEAR FROM CURRENT_DATE), 100),
        (v_business_id, 'payment', 'PAY', EXTRACT(YEAR FROM CURRENT_DATE), 100)
    ON CONFLICT DO NOTHING;

    SELECT * INTO v_business FROM public.businesses WHERE id = v_business_id;

    RETURN to_jsonb(v_business);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
