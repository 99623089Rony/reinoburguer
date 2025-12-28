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

-- admin_users: Todos podem ler
CREATE POLICY "public_read_admin_users" ON admin_users
FOR SELECT USING (true);

-- admin_users: Autenticados podem inserir/atualizar/deletar
CREATE POLICY "auth_write_admin_users" ON admin_users
FOR ALL USING (auth.role() = 'authenticated');

-- admin_access_requests: Todos podem inserir (para cadastro)
CREATE POLICY "public_insert_requests" ON admin_access_requests
FOR INSERT WITH CHECK (true);

-- admin_access_requests: Autenticados podem ler e atualizar
CREATE POLICY "auth_select_requests" ON admin_access_requests
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_update_requests" ON admin_access_requests
FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- VERIFICAÇÃO: Execute este SELECT para testar
-- ============================================
-- SELECT * FROM admin_users;
-- SELECT * FROM admin_access_requests;
