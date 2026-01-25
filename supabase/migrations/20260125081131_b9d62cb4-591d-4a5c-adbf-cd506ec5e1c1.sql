-- Create enum for work/budget status
CREATE TYPE public.work_status AS ENUM (
  'presupuesto_solicitado',
  'presupuesto_enviado',
  'presupuesto_aceptado',
  'factura_enviada',
  'trabajo_terminado'
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create works/jobs table (presupuestos, facturas, trabajos)
CREATE TABLE public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  invoice_number TEXT,
  due_date DATE,
  status work_status NOT NULL DEFAULT 'presupuesto_solicitado',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  budget_sent_at TIMESTAMPTZ,
  budget_responded_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for works
CREATE POLICY "Users can view their own works" ON public.works
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own works" ON public.works
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own works" ON public.works
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own works" ON public.works
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_works_updated_at
  BEFORE UPDATE ON public.works
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for works table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.works;