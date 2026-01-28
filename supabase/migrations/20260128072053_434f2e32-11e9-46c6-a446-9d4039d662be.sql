-- Permitir acceso sin login usando DEFAULT_USER_ID
-- Actualizar políticas para clients
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Users can view their own clients" ON public.clients
FOR SELECT USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create their own clients" ON public.clients
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can update their own clients" ON public.clients
FOR UPDATE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can delete their own clients" ON public.clients
FOR DELETE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Actualizar políticas para works
DROP POLICY IF EXISTS "Users can view their own works" ON public.works;
DROP POLICY IF EXISTS "Users can create their own works" ON public.works;
DROP POLICY IF EXISTS "Users can update their own works" ON public.works;
DROP POLICY IF EXISTS "Users can delete their own works" ON public.works;

CREATE POLICY "Users can view their own works" ON public.works
FOR SELECT USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create their own works" ON public.works
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can update their own works" ON public.works
FOR UPDATE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can delete their own works" ON public.works
FOR DELETE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Actualizar políticas para presupuestos
DROP POLICY IF EXISTS "Users can view their own presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Users can create their own presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Users can update their own presupuestos" ON public.presupuestos;
DROP POLICY IF EXISTS "Users can delete their own presupuestos" ON public.presupuestos;

CREATE POLICY "Users can view their own presupuestos" ON public.presupuestos
FOR SELECT USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create their own presupuestos" ON public.presupuestos
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can update their own presupuestos" ON public.presupuestos
FOR UPDATE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can delete their own presupuestos" ON public.presupuestos
FOR DELETE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Actualizar políticas para reminders
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can create their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;

CREATE POLICY "Users can view their own reminders" ON public.reminders
FOR SELECT USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create their own reminders" ON public.reminders
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can update their own reminders" ON public.reminders
FOR UPDATE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can delete their own reminders" ON public.reminders
FOR DELETE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Actualizar políticas para empresa_usuario
DROP POLICY IF EXISTS "Users can view their own company data" ON public.empresa_usuario;
DROP POLICY IF EXISTS "Users can create their own company data" ON public.empresa_usuario;
DROP POLICY IF EXISTS "Users can update their own company data" ON public.empresa_usuario;

CREATE POLICY "Users can view their own company data" ON public.empresa_usuario
FOR SELECT USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can create their own company data" ON public.empresa_usuario
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE POLICY "Users can update their own company data" ON public.empresa_usuario
FOR UPDATE USING (
  auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
);