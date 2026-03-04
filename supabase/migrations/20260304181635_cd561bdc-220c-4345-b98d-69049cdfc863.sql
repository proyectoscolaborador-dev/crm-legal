CREATE POLICY "Users can delete their own company data"
ON public.empresa_usuario
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);