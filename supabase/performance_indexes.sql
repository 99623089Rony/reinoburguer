-- PHASE 7: PERFORMANCE INDEXING OPTIMIZATIONS
-- Melhora a velocidade de buscas e reduz o "peso" do banco de dados.

-- 1. Índices para Chaves Estrangeiras (Acelera Joins e buscas por cliente/pedido)
CREATE INDEX IF NOT EXISTS idx_coupons_customer_phone ON public.coupons(customer_phone);
CREATE INDEX IF NOT EXISTS idx_coupons_reward_id ON public.coupons(reward_id);
CREATE INDEX IF NOT EXISTS idx_extras_options_group_id ON public.extras_options(group_id);
CREATE INDEX IF NOT EXISTS idx_store_config_ranking_prize_id ON public.store_config(ranking_prize_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);

-- 2. Remoção de Índices Não Utilizados (Acelera a criação de novos pedidos)
DROP INDEX IF EXISTS idx_payments_mp_id;
DROP INDEX IF EXISTS idx_orders_payment_status;
