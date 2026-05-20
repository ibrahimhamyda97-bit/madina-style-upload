-- Add CinetPay transaction tracking to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cinetpay_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_cinetpay_tx ON public.orders(cinetpay_transaction_id);
