-- The campaign_financial_reports table already exists. These policies only
-- enable authenticated investors to read reports through the authorized
-- campaign-level API route; they do not create or modify report rows.

ALTER TABLE public.campaign_financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_read_campaign_financial_reports"
  ON public.campaign_financial_reports;
CREATE POLICY "authenticated_can_read_campaign_financial_reports"
  ON public.campaign_financial_reports
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_can_read_financial_report_files"
  ON storage.objects;
CREATE POLICY "authenticated_can_read_financial_report_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'financial-reports');
