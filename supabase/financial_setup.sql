-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Vendas', 'Suprimentos', 'Sangria', 'Aporte'
    payment_method TEXT, -- 'Dinheiro', 'Pix', 'Cartão'
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- Link to order if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - intentionally disabled for simplicity as per previous instructions, 
-- but good practice to have the structure. For now, we allow public access as per other tables fixes.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (since we are handling auth in app logic/admin view)
CREATE POLICY "Enable all for authenticated users" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);

-- Grant access to public (creating a public policy to match previous pattern if needed)
CREATE POLICY "Enable read/write for all" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
