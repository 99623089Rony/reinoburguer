-- Add stock tracking columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;

-- Optional: Update existing products to have default values (already handled by DEFAULT, but good for clarity)
UPDATE products SET track_stock = false WHERE track_stock IS NULL;
UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL;
