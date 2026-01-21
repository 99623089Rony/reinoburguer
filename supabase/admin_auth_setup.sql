-- Admin Auth Setup (Zero-Overlap RLS)
-- Tabelas básicas para gestão de administradores

-- 1. admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select admin_users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Update admin_users" ON public.admin_users FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete admin_users" ON public.admin_users FOR DELETE USING (public.is_admin());

-- 2. admin_access_requests
CREATE TABLE IF NOT EXISTS public.admin_access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select admin_access_requests" ON public.admin_access_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert admin_access_requests" ON public.admin_access_requests FOR INSERT WITH CHECK (
    public.is_admin() OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND name IS NOT NULL AND length(name) > 1)
);
CREATE POLICY "Update admin_access_requests" ON public.admin_access_requests FOR UPDATE USING (public.is_admin());
CREATE POLICY "Delete admin_access_requests" ON public.admin_access_requests FOR DELETE USING (public.is_admin());

-- 3. Master Admin
INSERT INTO public.admin_users (email, role)
VALUES ('ronilsondesouza159@gmail.com', 'master')
ON CONFLICT (email) DO NOTHING;
