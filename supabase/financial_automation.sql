-- Function: Create transaction on order completion
CREATE OR REPLACE FUNCTION public.handle_order_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to FINISHED (and wasn't already FINISHED)
    IF NEW.status = 'FINISHED' AND (OLD.status IS DISTINCT FROM 'FINISHED') THEN
        
        -- Insert into transactions if not exists (prevent duplicates)
        IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE order_id = NEW.id) THEN
            INSERT INTO public.transactions (
                type,
                amount,
                description,
                category,
                payment_method,
                order_id,
                created_at
            ) VALUES (
                'INCOME',
                NEW.total,
                'Venda - Pedido #' || substring(NEW.id::text from 1 for 8),
                'Vendas',
                NEW.payment_method,
                NEW.id,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run after update on orders
DROP TRIGGER IF EXISTS on_order_completion ON public.orders;

CREATE TRIGGER on_order_completion
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_order_completion();
