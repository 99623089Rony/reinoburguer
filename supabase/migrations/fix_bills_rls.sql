-- NUCLEAR FIX FOR 403 FORBIDDEN ON BILLS
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/saikxbiidcupcudrrhlv/sql

-- 1. Ensure the required columns exist for linking
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS transaction_id UUID;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS bill_id UUID;

-- 2. Repair RLS for the bills table
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- DROP any old or conflicting policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Admin can do everything on bills" ON public.bills;
DROP POLICY IF EXISTS "Select bills" ON public.bills;
DROP POLICY IF EXISTS "Insert bills" ON public.bills;
DROP POLICY IF EXISTS "Update bills" ON public.bills;
DROP POLICY IF EXISTS "Delete bills" ON public.bills;

-- Use the project pattern: public.is_admin()
CREATE POLICY "Select bills" ON public.bills FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert bills" ON public.bills FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Update bills" ON public.bills FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete bills" ON public.bills FOR DELETE USING (public.is_admin());

-- 3. Explicitly grant permissions to the roles
GRANT ALL ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
GRANT ALL ON public.transactions TO authenticated;

-- 4. Verify RLS for transactions table (just in case)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Select transactions" ON public.transactions;
CREATE POLICY "Select transactions" ON public.transactions FOR SELECT USING (public.is_admin());
-- (Insert/Update/Delete should already be there from fix_security_rls.sql, but we ensure them)
DROP POLICY IF EXISTS "Insert transactions" ON public.transactions;
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_admin());
