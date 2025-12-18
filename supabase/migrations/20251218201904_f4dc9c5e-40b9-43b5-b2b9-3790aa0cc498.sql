-- Create flow_submissions table for storing completed flow results
CREATE TABLE public.flow_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rdv_id TEXT NOT NULL,
  flow_id UUID NOT NULL REFERENCES public.flow_schemas(id),
  flow_version INTEGER NOT NULL,
  result_json JSONB NOT NULL DEFAULT '{}',
  client_operation_id UUID NOT NULL UNIQUE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_by UUID REFERENCES auth.users(id),
  agency_id UUID REFERENCES public.apogee_agencies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_flow_submissions_rdv_id ON public.flow_submissions(rdv_id);
CREATE INDEX idx_flow_submissions_flow_id ON public.flow_submissions(flow_id);
CREATE INDEX idx_flow_submissions_agency_id ON public.flow_submissions(agency_id);

CREATE POLICY "Users can view own submissions" ON public.flow_submissions FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "Users can insert own submissions" ON public.flow_submissions FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Admins can view all submissions" ON public.flow_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.global_role IN ('platform_admin', 'superadmin'))
);