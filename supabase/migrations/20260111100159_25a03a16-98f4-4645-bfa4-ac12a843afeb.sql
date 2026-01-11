-- Increase file size limit for rh-meetings bucket to 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE name = 'rh-meetings';