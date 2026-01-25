-- Add cliente_nif column to presupuestos table
ALTER TABLE public.presupuestos 
ADD COLUMN IF NOT EXISTS cliente_nif TEXT;