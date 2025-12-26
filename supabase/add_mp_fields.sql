-- Add Mercado Pago payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add index for faster lookup by payment_id
CREATE INDEX IF NOT EXISTS idx_orders_mp_payment_id ON public.orders(mp_payment_id);

-- Ensure RLS allows updates (if applicable, though we usually use service_role in functions)
-- But just in case client needs to read it
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."orders"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
