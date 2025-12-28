-- ============================================
-- FIX: Admin Access Requests - Políticas RLS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Verificar se a tabela existe, se não, criar
CREATE TABLE IF NOT EXISTS admin_access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Garantir que RLS está ativado
ALTER TABLE admin_access_requests ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Allow public insert access" ON admin_access_requests;
DROP POLICY IF EXISTS "Allow admin full access" ON admin_access_requests;
DROP POLICY IF EXISTS "Allow public read for pending" ON admin_access_requests;
DROP POLICY IF EXISTS "Allow anyone to insert requests" ON admin_access_requests;
DROP POLICY IF EXISTS "Allow admins to view all requests" ON admin_access_requests;
DROP POLICY IF EXISTS "Allow admins to update requests" ON admin_access_requests;

-- 4. Criar políticas corretas

-- Permite qualquer pessoa criar uma solicitação (sem estar logado)
CREATE POLICY "Allow anyone to insert requests" 
ON admin_access_requests 
FOR INSERT 
WITH CHECK (true);

-- Permite admins autorizados verem TODAS as solicitações
CREATE POLICY "Allow admins to view all requests" 
ON admin_access_requests 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Permite admins atualizarem o status das solicitações
CREATE POLICY "Allow admins to update requests" 
ON admin_access_requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- ============================================
-- 5. Verificar se tabela admin_users existe
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON admin_users;
DROP POLICY IF EXISTS "Allow admin write access" ON admin_users;

-- Permite leitura pública (necessário para verificar se email está autorizado)
CREATE POLICY "Allow public read access" 
ON admin_users 
FOR SELECT 
USING (true);

-- Permite admins gerenciarem a tabela
CREATE POLICY "Allow admin write access" 
ON admin_users 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM admin_users au
        WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- 6. Garantir que você é o admin mestre
INSERT INTO admin_users (email, role)
VALUES ('ronilsondesouza159@gmail.com', 'master')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Pronto! Agora as solicitações vão aparecer
-- ============================================
