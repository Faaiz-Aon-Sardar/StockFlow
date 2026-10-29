-- ============================================================================
-- Migration 009: Pre-configured Live Demo Account & Starter Catalog
-- Creates verified login credentials for testing and exploration.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    v_business_id UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- 1. Create or update Demo User in auth.users with password 'Demo@123456'
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo.stockflow@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'demo.stockflow@gmail.com',
            crypt('Demo@123456', gen_salt('bf', 10)),
            timezone('utc'::text, now()),
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('sub', v_user_id::text, 'email', 'demo.stockflow@gmail.com', 'full_name', 'Demo Business Owner', 'email_verified', true, 'phone_verified', false),
            null,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        );
    ELSE
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.stockflow@gmail.com';
        UPDATE auth.users
        SET encrypted_password = crypt('Demo@123456', gen_salt('bf', 10)),
            email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
            confirmation_token = '',
            recovery_token = '',
            email_change_token_new = '',
            email_change = '',
            is_super_admin = null,
            raw_user_meta_data = jsonb_build_object('sub', v_user_id::text, 'email', 'demo.stockflow@gmail.com', 'full_name', 'Demo Business Owner', 'email_verified', true, 'phone_verified', false)
        WHERE id = v_user_id;
    END IF;

    -- 1b. Ensure identity exists in auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', 'demo.stockflow@gmail.com', 'full_name', 'Demo Business Owner', 'email_verified', true, 'phone_verified', false),
        'email',
        v_user_id::text,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (provider, provider_id) DO UPDATE
    SET identity_data = EXCLUDED.identity_data,
        updated_at = timezone('utc'::text, now());

    -- 2. Ensure profile exists in public.profiles
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (v_user_id, 'demo.stockflow@gmail.com', 'Demo Business Owner', timezone('utc'::text, now()), timezone('utc'::text, now()))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

    -- 3. Create Demo Business in public.businesses
    INSERT INTO public.businesses (
        id,
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
        v_business_id,
        'StockFlow Wholesale Distributors',
        'StockFlow Hub',
        '27AABCS1429B1Z8',
        'Plot 42, Sector 18, Vashi APMC Market, Navi Mumbai 400703',
        'Maharashtra',
        '27',
        'INR',
        '₹',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO NOTHING;

    -- 4. Associate Demo User as Owner in public.business_members
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
    )
    ON CONFLICT (business_id, user_id) DO UPDATE SET is_active = true, role = 'owner';

    -- 5. Seed Document Sequences
    INSERT INTO public.document_sequences (business_id, document_type, prefix, year, current_value)
    VALUES
        (v_business_id, 'order', 'SO', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 100),
        (v_business_id, 'invoice', 'INV', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 100),
        (v_business_id, 'dispatch', 'DSP', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 100),
        (v_business_id, 'purchase', 'PO', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 100),
        (v_business_id, 'payment', 'PAY', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 100)
    ON CONFLICT (business_id, document_type, year) DO NOTHING;

    -- 6. Seed Sample Wholesale Products
    INSERT INTO public.products (
        id,
        business_id,
        sku,
        name,
        category,
        uom,
        purchase_cost,
        default_selling_price,
        reorder_level,
        hsn_code,
        gst_rate,
        status
    )
    VALUES
        ('c0000000-0000-0000-0000-000000000001'::uuid, v_business_id, 'FMCG-RICE-25K', 'Daawat Rozana Super Basmati Rice (25kg Bag)', 'Grains & Pulses', 'bag', 1850.00, 2350.00, 15, '1006', 5, 'active'),
        ('c0000000-0000-0000-0000-000000000002'::uuid, v_business_id, 'FMCG-OIL-15L', 'Fortune Sunlite Refined Sunflower Oil (15L Carton)', 'Edible Oils', 'carton', 1950.00, 2280.00, 10, '1512', 5, 'active'),
        ('c0000000-0000-0000-0000-000000000003'::uuid, v_business_id, 'FMCG-TEA-250', 'Tata Tea Gold Leaf Pouch (250g x 24 Case)', 'Beverages', 'crate', 2880.00, 3600.00, 8, '0902', 5, 'active'),
        ('c0000000-0000-0000-0000-000000000004'::uuid, v_business_id, 'FMCG-BIS-DARK', 'Sunfeast Dark Fantasy Choco Fills (300g Box x 12)', 'Packaged Foods', 'box', 1200.00, 1560.00, 12, '1905', 18, 'active')
    ON CONFLICT (business_id, sku) DO NOTHING;

    -- 7. Seed Initial Inventory Ledger via stock_movements
    IF NOT EXISTS (SELECT 1 FROM public.stock_movements WHERE business_id = v_business_id) THEN
        INSERT INTO public.stock_movements (
            business_id,
            product_id,
            movement_type,
            change_qty,
            previous_stock,
            new_stock,
            unit_cost,
            reason,
            reference_type
        )
        VALUES
            (v_business_id, 'c0000000-0000-0000-0000-000000000001'::uuid, 'adjustment', 85, 0, 85, 1850.00, 'Initial demo inventory load', 'manual_adjustment'),
            (v_business_id, 'c0000000-0000-0000-0000-000000000002'::uuid, 'adjustment', 42, 0, 42, 1950.00, 'Initial demo inventory load', 'manual_adjustment'),
            (v_business_id, 'c0000000-0000-0000-0000-000000000003'::uuid, 'adjustment', 30, 0, 30, 2880.00, 'Initial demo inventory load', 'manual_adjustment'),
            (v_business_id, 'c0000000-0000-0000-0000-000000000004'::uuid, 'adjustment', 60, 0, 60, 1200.00, 'Initial demo inventory load', 'manual_adjustment');
    END IF;

    -- 8. Seed Sample Commercial Parties
    INSERT INTO public.parties (
        business_id,
        code,
        name,
        party_type,
        contact_person,
        phone,
        email,
        billing_address,
        gstin,
        payment_terms,
        credit_limit,
        opening_balance,
        status
    )
    VALUES
        (v_business_id, 'CUST-1001', 'Ganesh Provision & Supermarket', 'customer', 'Suresh Patel', '+91 98200 11223', 'ganesh.provision@gmail.com', 'Shop 4, Station Road, Thane West 400601', '27AABCG1234F1Z5', 'net_15', 100000.00, 14500.00, 'active'),
        (v_business_id, 'CUST-1002', 'Balaji Kirana & Departmental Stores', 'customer', 'Ramesh Gupta', '+91 98211 22334', 'balaji.kirana@gmail.com', 'Sector 9, Nerul, Navi Mumbai 400706', '27AAECB9988P1Z3', 'net_7', 50000.00, 8200.00, 'active'),
        (v_business_id, 'SUPP-2001', 'Adani Wilmar Depot Navi Mumbai', 'supplier', 'Manish Joshi', '+91 98330 12345', 'depot.vashi@adaniwilmar.in', 'Plot 12, TTC Industrial Area, MIDC, Mahape 400710', '27AAACA1289H1Z2', 'net_30', 0, 45000.00, 'active')
    ON CONFLICT (business_id, code) DO NOTHING;
END $$;
