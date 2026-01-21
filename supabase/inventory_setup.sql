-- Add inventory tracking columns to products table

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Optional: Create a function to safely decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - quantity,
      in_stock = CASE 
        WHEN stock_quantity - quantity <= 0 THEN false 
        ELSE true 
      END
  WHERE id = p_id AND track_stock = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
