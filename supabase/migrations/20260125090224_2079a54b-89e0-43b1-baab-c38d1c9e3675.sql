-- Tabla para datos de empresa del usuario (uno por usuario)
CREATE TABLE public.empresa_usuario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  empresa_nombre TEXT NOT NULL,
  empresa_razon_social TEXT,
  empresa_cif TEXT NOT NULL,
  empresa_direccion TEXT NOT NULL,
  empresa_cp TEXT NOT NULL,
  empresa_ciudad TEXT NOT NULL,
  empresa_provincia TEXT NOT NULL,
  empresa_telefono TEXT NOT NULL,
  empresa_email TEXT NOT NULL,
  empresa_web TEXT,
  empresa_logo_url TEXT,
  condiciones_generales TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.empresa_usuario ENABLE ROW LEVEL SECURITY;

-- Policies for empresa_usuario
CREATE POLICY "Users can view their own company data"
ON public.empresa_usuario
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company data"
ON public.empresa_usuario
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company data"
ON public.empresa_usuario
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_empresa_usuario_updated_at
BEFORE UPDATE ON public.empresa_usuario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla para presupuestos
CREATE TABLE public.presupuestos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero_presupuesto TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT,
  cliente_telefono TEXT,
  cliente_direccion TEXT,
  cliente_cp TEXT,
  cliente_ciudad TEXT,
  cliente_provincia TEXT,
  descripcion_trabajo_larga TEXT,
  obra_titulo TEXT NOT NULL,
  partidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC NOT NULL DEFAULT 21,
  iva_importe NUMERIC NOT NULL DEFAULT 0,
  total_presupuesto NUMERIC NOT NULL DEFAULT 0,
  estado_presupuesto TEXT NOT NULL DEFAULT 'borrador',
  fecha_presupuesto DATE NOT NULL DEFAULT CURRENT_DATE,
  validez_dias INTEGER NOT NULL DEFAULT 30,
  comercial_nombre TEXT,
  pdf_url TEXT,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;

-- Policies for presupuestos
CREATE POLICY "Users can view their own presupuestos"
ON public.presupuestos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presupuestos"
ON public.presupuestos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presupuestos"
ON public.presupuestos
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presupuestos"
ON public.presupuestos
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_presupuestos_updated_at
BEFORE UPDATE ON public.presupuestos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('presupuestos-pdf', 'presupuestos-pdf', true);

-- Storage policies
CREATE POLICY "Users can view their own PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'presupuestos-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'presupuestos-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'presupuestos-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'presupuestos-pdf' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Make PDFs publicly accessible for download
CREATE POLICY "Public can view presupuestos PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'presupuestos-pdf');