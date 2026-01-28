-- Crear política que permita subir imágenes al folder work-images sin autenticación
-- Esto es necesario porque el CRM usa DEFAULT_USER_ID para usuarios no autenticados

CREATE POLICY "Anyone can upload work images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'presupuestos-pdf' 
  AND (storage.foldername(name))[1] = 'work-images'
);

-- Política para permitir eliminar imágenes del folder work-images
CREATE POLICY "Anyone can delete work images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'presupuestos-pdf' 
  AND (storage.foldername(name))[1] = 'work-images'
);