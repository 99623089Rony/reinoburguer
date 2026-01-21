-- Fix Admin Access RLS (Nuclear Version)
-- Execute no SQL Editor para resetar as permissões de administração

-- 1. LIMPAR TUDO
DROP POLICY IF EXISTS "Admin Manage Requests" ON admin_access_requests;
DROP POLICY IF EXISTS "Public Insert Requests" ON admin_access_requests;
DROP POLICY IF EXISTS "Public Read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admin Manage admin_users" ON admin_users;

-- 2. RECONSTRUIR SEM SOBREPOSIÇÃO
-- admin_users
CREATE POLICY "Public Read admin_users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admin Manage admin_users" ON admin_users FOR ALL USING (public.is_admin());

-- admin_access_requests
CREATE POLICY "Admin Manage Requests" ON admin_access_requests FOR ALL USING (public.is_admin());
CREATE POLICY "Public Insert Requests" ON admin_access_requests 
FOR INSERT WITH CHECK (
    public.is_admin() OR (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
        AND name IS NOT NULL 
        AND length(name) > 1
    )
);
