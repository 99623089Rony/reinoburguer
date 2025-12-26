-- Adiciona colunas para taxas separadas de Débito e Crédito
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS card_debit_fee_percent NUMERIC DEFAULT 0;
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS card_credit_fee_percent NUMERIC DEFAULT 0;

-- Remove a coluna antiga (se existir) - Opcional
-- ALTER TABLE store_config DROP COLUMN IF EXISTS card_fee_percent;

