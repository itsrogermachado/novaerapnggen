import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DiscordImage {
  id: string;
  image_url: string;
  uploaded_at: string;
  expires_at: string;
}

async function fetchDiscordImages(): Promise<DiscordImage[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/discord-images", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to fetch images");
  }

  const { images } = await response.json();
  return images;
}

export function useDiscordImages() {
  return useQuery({
    queryKey: ["discord-images"],
    queryFn: fetchDiscordImages,
    refetchInterval: 30_000, // auto-refresh every 30s
    staleTime: 15_000,
    select: (images) =>
      images.filter((img) => new Date(img.expires_at) > new Date()),
  });
}
