-- Create storage bucket for Apogee Excel imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('apogee-imports', 'apogee-imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for apogee-imports bucket
CREATE POLICY "Authenticated users can upload Excel files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'apogee-imports');

CREATE POLICY "Authenticated users can view Excel files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'apogee-imports');

CREATE POLICY "Authenticated users can delete Excel files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'apogee-imports');