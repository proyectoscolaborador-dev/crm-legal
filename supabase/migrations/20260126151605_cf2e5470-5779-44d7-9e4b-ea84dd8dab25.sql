-- Add advance_payments field to works table to track partial payments
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS advance_payments numeric NOT NULL DEFAULT 0;

-- Add images field to works table as JSONB array
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update work_status enum to include the new stages
-- First, let's add the new statuses (if they don't exist)
-- Note: In PostgreSQL, we need to add values to the enum

-- Add 'pendiente_facturar' status
DO $$ BEGIN
    ALTER TYPE public.work_status ADD VALUE IF NOT EXISTS 'pendiente_facturar' AFTER 'presupuesto_aceptado';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add 'cobrado' status
DO $$ BEGIN
    ALTER TYPE public.work_status ADD VALUE IF NOT EXISTS 'cobrado' AFTER 'trabajo_terminado';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;