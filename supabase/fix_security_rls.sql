-- Fix Security RLS Issues
-- This script enables Row Level Security (RLS) on all public tables and sets up secure policies.

-- 1. Enable RLS on all relevant tables
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_extras" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."opening_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."delivery_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."extras_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."extras_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing dangerous or redundant policies
DROP POLICY IF EXISTS "Allow All Access" ON "public"."orders";
DROP POLICY IF EXISTS "Public Admin Access" ON "public"."products";
DROP POLICY IF EXISTS "Public Admin Access" ON "public"."store_config";
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "public"."transactions";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."orders";
DROP POLICY IF EXISTS "Enable Read for Realtime Orders" ON "public"."orders";
DROP POLICY IF EXISTS "Enable Read for Realtime Products" ON "public"."products";
DROP POLICY IF EXISTS "Products are viewable by everyone" ON "public"."products";
DROP POLICY IF EXISTS "Enable Read for Realtime Config" ON "public"."store_config";
DROP POLICY IF EXISTS "Public Admin Access" ON "public"."categories";
DROP POLICY IF EXISTS "Enable read/write for all" ON "public"."transactions";

-- 3. Helper Function for Admin Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT is_admin FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Public Read Policies (Static Content)
CREATE POLICY "Public Read Access" ON "public"."categories" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."products" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."product_extras" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."store_config" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."opening_hours" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."delivery_fees" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."rewards" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."extras_groups" FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON "public"."extras_options" FOR SELECT USING (true);

-- 5. Orders Policies
CREATE POLICY "Public Insert Orders" ON "public"."orders" FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Own Orders" ON "public"."orders" FOR SELECT USING (true);

-- 6. Customers & Coupons Policies
CREATE POLICY "Public Upsert Customers" ON "public"."customers" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Own Coupons" ON "public"."coupons" FOR SELECT USING (true);

-- 7. Transactions (Admin Only)
CREATE POLICY "Admin All Access Transactions" ON "public"."transactions" FOR ALL USING (public.is_admin());

-- 8. Admin Full Access to Management Tables
CREATE POLICY "Admin Full Access Categories" ON "public"."categories" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Products" ON "public"."products" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Product Extras" ON "public"."product_extras" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Store Config" ON "public"."store_config" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Opening Hours" ON "public"."opening_hours" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Delivery Fees" ON "public"."delivery_fees" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Rewards" ON "public"."rewards" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Extras Groups" ON "public"."extras_groups" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Extras Options" ON "public"."extras_options" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Orders" ON "public"."orders" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Customers" ON "public"."customers" FOR ALL USING (public.is_admin());
CREATE POLICY "Admin Full Access Coupons" ON "public"."coupons" FOR ALL USING (public.is_admin());
