-- Create apogee_agencies table
CREATE TABLE public.apogee_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on apogee_agencies
ALTER TABLE public.apogee_agencies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view basic agency info (not API credentials)
CREATE POLICY "Authenticated users can view agencies"
ON public.apogee_agencies
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert agencies
CREATE POLICY "Only admins can insert agencies"
ON public.apogee_agencies
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update agencies
CREATE POLICY "Only admins can update agencies"
ON public.apogee_agencies
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete agencies
CREATE POLICY "Only admins can delete agencies"
ON public.apogee_agencies
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create apogee_api_credentials table (optional, for per-agency keys)
CREATE TABLE public.apogee_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- Enable RLS on apogee_api_credentials
ALTER TABLE public.apogee_api_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can select API credentials
CREATE POLICY "Only admins can view API credentials"
ON public.apogee_api_credentials
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert API credentials
CREATE POLICY "Only admins can insert API credentials"
ON public.apogee_api_credentials
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update API credentials
CREATE POLICY "Only admins can update API credentials"
ON public.apogee_api_credentials
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete API credentials
CREATE POLICY "Only admins can delete API credentials"
ON public.apogee_api_credentials
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on apogee_agencies
CREATE TRIGGER update_apogee_agencies_updated_at
BEFORE UPDATE ON public.apogee_agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on apogee_api_credentials
CREATE TRIGGER update_apogee_api_credentials_updated_at
BEFORE UPDATE ON public.apogee_api_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();