-- Financial Setup - Versão Corrigida (Ignora se já existir)
-- Execute este script no Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transactions table (só se não existir)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (para evitar erro de duplicação)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable read/write for all" ON public.transactions;

-- Create policies
CREATE POLICY "Admin All Access Transactions" ON public.transactions
    FOR ALL USING (public.is_admin());

-- Enable Realtime (ignora se já estiver adicionado)
DO $$
BEGIN
    -- Tenta adicionar a tabela ao Realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION
    WHEN duplicate_object THEN
        -- Ignora se já estiver adicionado
        RAISE NOTICE 'Table transactions already in supabase_realtime publication';
END $$;
