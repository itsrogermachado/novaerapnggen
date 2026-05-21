
-- Backgrounds table
CREATE TABLE public.backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sem nome',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backgrounds select" ON public.backgrounds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own backgrounds insert" ON public.backgrounds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own backgrounds update" ON public.backgrounds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own backgrounds delete" ON public.backgrounds FOR DELETE USING (auth.uid() = user_id);

-- Logos table
CREATE TABLE public.logos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sem nome',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logos select" ON public.logos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own logos insert" ON public.logos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logos update" ON public.logos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own logos delete" ON public.logos FOR DELETE USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies (user folder = auth.uid())
CREATE POLICY "backgrounds public read" ON storage.objects FOR SELECT USING (bucket_id = 'backgrounds');
CREATE POLICY "backgrounds user upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "backgrounds user update" ON storage.objects FOR UPDATE USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "backgrounds user delete" ON storage.objects FOR DELETE USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "logos public read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "logos user upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos user update" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos user delete" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
