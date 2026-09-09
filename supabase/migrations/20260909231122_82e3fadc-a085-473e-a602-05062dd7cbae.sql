CREATE TABLE public.product_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  product_name text,
  brand text,
  notes text,
  front_photo_path text,
  nutrition_photo_path text,
  ingredients_photo_path text,
  source text NOT NULL DEFAULT 'user_submitted',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_submissions TO authenticated;
GRANT ALL ON public.product_submissions TO service_role;

ALTER TABLE public.product_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own submissions"
ON public.product_submissions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX product_submissions_barcode_idx ON public.product_submissions (barcode);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER update_product_submissions_updated_at
BEFORE UPDATE ON public.product_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();