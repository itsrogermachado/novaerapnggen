-- Discord Images: temporary storage (24h TTL) for bot-uploaded screenshots
CREATE TABLE public.discord_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.discord_images ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view images
CREATE POLICY "authenticated users can view discord images"
  ON public.discord_images FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index for efficient cleanup queries
CREATE INDEX idx_discord_images_expires_at ON public.discord_images (expires_at);

-- Storage bucket for discord bot uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('discord-images', 'discord-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for the bucket
CREATE POLICY "discord images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'discord-images');
