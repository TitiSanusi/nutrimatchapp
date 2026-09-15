CREATE TABLE public.scan_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  product_name text,
  brand text,
  image_url text,
  last_scanned_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scan_history_user_barcode_unique UNIQUE (user_id, barcode)
);

CREATE INDEX scan_history_user_recent_idx
  ON public.scan_history (user_id, last_scanned_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;
GRANT ALL ON public.scan_history TO service_role;

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan history"
  ON public.scan_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own scan history"
  ON public.scan_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan history"
  ON public.scan_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan history"
  ON public.scan_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER scan_history_set_updated_at
  BEFORE UPDATE ON public.scan_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();