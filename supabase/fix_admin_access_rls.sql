-- ============================================
-- FIX SIMPLIFICADO - Execute no SQL Editor do Supabase
-- ============================================

-- PASSO 1: Desabilitar RLS temporariamente para corrigir
ALTER TABLE IF EXISTS admin_access_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_access_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON admin_access_requests', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON admin_users', pol.policyname);
    END LOOP;
END $$;

-- PASSO 3: Garantir que as tabelas existem
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PASSO 4: Garantir que você é admin
INSERT INTO admin_users (email, role)
VALUES ('ronilsondesouza159@gmail.com', 'master')
ON CONFLICT (email) DO NOTHING;

-- PASSO 5: Reabilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_requests ENABLE ROW LEVEL SECURITY;

-- PASSO 6: Criar políticas SIMPLES que funcionam

-- admin_users: Todos podem ler (para login)
CREATE POLICY "public_read_admin_users" ON admin_users
FOR SELECT USING (true);

-- admin_users: Apenas admins podem alterar
CREATE POLICY "admin_write_admin_users" ON admin_users
FOR ALL USING (public.is_admin());

-- admin_access_requests: Todos podem inserir (para cadastro) com validação básica
CREATE POLICY "public_insert_requests" ON admin_access_requests
FOR INSERT WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    AND name IS NOT NULL 
    AND length(name) > 1
);

-- admin_access_requests: Apenas admins podem ver e gerenciar
CREATE POLICY "admin_all_access_requests" ON admin_access_requests
FOR ALL USING (public.is_admin());

-- ============================================
-- VERIFICAÇÃO: Execute este SELECT para testar
-- ============================================
-- SELECT * FROM admin_users;
-- SELECT * FROM admin_access_requests;
