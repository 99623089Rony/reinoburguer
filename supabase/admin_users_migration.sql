-- =====================================================
-- Admin Users Authorization Table
-- =====================================================
-- Tabela para armazenar emails de administradores autorizados
-- Apenas emails nesta tabela podem criar conta e acessar o painel admin

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Adicionar primeiro admin: ronilsondesouza159@gmail.com
INSERT INTO admin_users (email, created_by) 
VALUES ('ronilsondesouza159@gmail.com', 'system')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer pessoa verifique se um email está autorizado
-- (necessário para validação durante cadastro)
CREATE POLICY "Anyone can check if email is authorized" ON admin_users
  FOR SELECT USING (true);

-- Apenas admins autenticados podem inserir novos admins
CREATE POLICY "Only admins can add new admins" ON admin_users
  FOR INSERT WITH CHECK (
    auth.email() IN (SELECT email FROM admin_users)
  );

-- Comentário de uso
COMMENT ON TABLE admin_users IS 'Lista de emails autorizados a acessar o painel administrativo. Apenas emails nesta tabela podem criar conta admin.';
