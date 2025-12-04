-- Create agency-stamps storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-stamps', 'agency-stamps', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Agency users can view their own agency stamps
CREATE POLICY "Agency users can view their agency stamps"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'agency-stamps' 
  AND (storage.foldername(name))[1] = (SELECT agency_id::text FROM profiles WHERE id = auth.uid())
);

-- Policy: N2+ users can manage their own agency stamps
CREATE POLICY "N2+ users can upload agency stamps"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-stamps'
  AND (storage.foldername(name))[1] = (SELECT agency_id::text FROM profiles WHERE id = auth.uid())
  AND has_min_global_role(auth.uid(), 2)
);

-- Policy: N2+ users can update/delete their agency stamps
CREATE POLICY "N2+ users can delete agency stamps"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-stamps'
  AND (storage.foldername(name))[1] = (SELECT agency_id::text FROM profiles WHERE id = auth.uid())
  AND has_min_global_role(auth.uid(), 2)
);

-- Policy: Franchiseurs (N3+) can view all agency stamps
CREATE POLICY "Franchiseurs can view all stamps"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'agency-stamps'
  AND has_min_global_role(auth.uid(), 3)
);

-- Policy: Franchiseurs with management rights can manage stamps
CREATE POLICY "Franchiseurs can manage stamps"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-stamps'
  AND has_min_global_role(auth.uid(), 4)
);

CREATE POLICY "Franchiseurs can delete stamps"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-stamps'
  AND has_min_global_role(auth.uid(), 4)
);