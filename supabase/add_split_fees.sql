-- Add split card fee columns to store_config table
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS card_debit_fee_percent numeric DEFAULT 0;
ALTER TABLE store_config ADD COLUMN IF NOT EXISTS card_credit_fee_percent numeric DEFAULT 0;

-- Optional: Migrate existing generic card fee to credit fee (safest assumption) if needed, 
-- but we'll default to 0 and let user configure.
