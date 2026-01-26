-- Create storage policy for work images
-- Allow authenticated users to upload to presupuestos-pdf bucket
CREATE POLICY "Authenticated users can upload work images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'presupuestos-pdf');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update work images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'presupuestos-pdf' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'presupuestos-pdf' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to all files in presupuestos-pdf bucket
CREATE POLICY "Public read access for presupuestos-pdf"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'presupuestos-pdf');