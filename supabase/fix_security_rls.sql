-- NUCLEAR RLS CONSOLIDATION - FINAL STATE (ZERO OVERLAP)
-- Este script limpa todas as regras e as recria seguindo o padrão de comando único.

-- 1. LIMPEZA TOTAL
DO $$ 
DECLARE 
    tbl RECORD;
    pol RECORD;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl.tablename
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl.tablename);
        END LOOP;
    END LOOP;
END $$;

-- 2. FUNÇÃO AUXILIAR
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. TABELAS PADRÃO (Comando Único)
DO $$
DECLARE
    tbl_name TEXT;
    target_tables TEXT[] := ARRAY['products', 'categories', 'coupons', 'delivery_fees', 'opening_hours', 'store_config', 'rewards', 'product_extras', 'extras_groups', 'extras_options', 'payments', 'admin_users'];
BEGIN
    FOREACH tbl_name IN ARRAY target_tables
    LOOP
        EXECUTE format('CREATE POLICY "Select %s" ON public.%I FOR SELECT USING (true)', tbl_name, tbl_name);
        EXECUTE format('CREATE POLICY "Insert %s" ON public.%I FOR INSERT WITH CHECK (public.is_admin())', tbl_name, tbl_name);
        EXECUTE format('CREATE POLICY "Update %s" ON public.%I FOR UPDATE USING (public.is_admin())', tbl_name, tbl_name);
        EXECUTE format('CREATE POLICY "Delete %s" ON public.%I FOR DELETE USING (public.is_admin())', tbl_name, tbl_name);
    END LOOP;
END $$;

-- 4. TRANSAÇÕES
CREATE POLICY "Select transactions" ON public.transactions FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Update transactions" ON public.transactions FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete transactions" ON public.transactions FOR DELETE USING (public.is_admin());

-- 5. GESTÃO DE ACESSO
CREATE POLICY "Select admin_access_requests" ON public.admin_access_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert admin_access_requests" ON public.admin_access_requests FOR INSERT WITH CHECK (
    public.is_admin() OR (email ~* ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'' AND name IS NOT NULL AND length(name) > 1)
);
CREATE POLICY "Update admin_access_requests" ON public.admin_access_requests FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete admin_access_requests" ON public.admin_access_requests FOR DELETE USING (public.is_admin());

-- 6. DADOS DE CLIENTES E PEDIDOS
-- customers
CREATE POLICY "Select customers" ON public.customers FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert customers" ON public.customers FOR INSERT WITH CHECK (phone IS NOT NULL AND length(phone) >= 8);
CREATE POLICY "Update customers" ON public.customers FOR UPDATE USING (phone IS NOT NULL OR public.is_admin());
CREATE POLICY "Delete customers" ON public.customers FOR DELETE USING (public.is_admin());

-- orders
CREATE POLICY "Select orders" ON public.orders FOR SELECT USING (public.is_admin() OR (created_at > (now() - interval ''90 days'') AND phone IS NOT NULL));
CREATE POLICY "Insert orders" ON public.orders FOR INSERT WITH CHECK (phone IS NOT NULL AND total > 0);
CREATE POLICY "Update orders" ON public.orders FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete orders" ON public.orders FOR DELETE USING (public.is_admin());

-- 7. PERFIS
CREATE POLICY "Select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Insert profiles" ON public.profiles FOR INSERT WITH CHECK ((id = (SELECT auth.uid())) OR public.is_admin());
CREATE POLICY "Update profiles" ON public.profiles FOR UPDATE USING ((id = (SELECT auth.uid())) OR public.is_admin());
CREATE POLICY "Delete profiles" ON public.profiles FOR DELETE USING (public.is_admin());
