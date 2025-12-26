-- ===========================================
-- CORRIGIR TABELA CUSTOMERS
-- Execute este script no SQL Editor do Supabase
-- ===========================================

-- 1. Remove a política existente (se houver)
DROP POLICY IF EXISTS "Allow public read/write" ON public.customers;

-- 2. Recria a política de acesso público
CREATE POLICY "Allow public read/write" ON public.customers FOR ALL USING (true);

-- 3. Garante que RLS está desabilitado (acesso total)
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- Pronto!
