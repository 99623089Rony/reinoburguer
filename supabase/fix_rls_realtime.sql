-- ===========================================
-- CORREÇÃO RLS - REINO BURGUER
-- Execute este script no SQL Editor do Supabase
-- ===========================================

-- 1. Desabilita RLS nas tabelas principais (permite acesso total)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config DISABLE ROW LEVEL SECURITY;

-- 2. Adiciona colunas faltantes (se não existirem)
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ranking_enabled BOOLEAN DEFAULT true, 
ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS reward_title TEXT;

ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS product_id UUID;

-- Pronto! O Realtime já está habilitado.
-- Agora seus pedidos e produtos devem sincronizar corretamente.
