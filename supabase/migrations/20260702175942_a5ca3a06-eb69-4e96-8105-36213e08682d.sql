
CREATE TABLE public.preference_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text NOT NULL,
  signal smallint NOT NULL,
  source text,
  place_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX preference_signals_user_tag_idx ON public.preference_signals(user_id, tag);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preference_signals TO authenticated;
GRANT ALL ON public.preference_signals TO service_role;
ALTER TABLE public.preference_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own signals" ON public.preference_signals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
