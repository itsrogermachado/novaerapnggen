import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: expired, error: fetchError } = await supabase
    .from("discord_images")
    .select("id, storage_path")
    .lt("expires_at", new Date().toISOString());

  if (fetchError) {
    console.error("[cleanup] Fetch error:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!expired || expired.length === 0) {
    console.log("[cleanup] No expired images found.");
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  // Delete files from storage
  const paths = expired.map((img: { storage_path: string }) => img.storage_path);
  const { error: storageError } = await supabase.storage
    .from("discord-images")
    .remove(paths);

  if (storageError) {
    console.error("[cleanup] Storage delete error:", storageError);
  }

  // Delete records from database
  const ids = expired.map((img: { id: string }) => img.id);
  const { error: dbError } = await supabase
    .from("discord_images")
    .delete()
    .in("id", ids);

  if (dbError) {
    console.error("[cleanup] DB delete error:", dbError);
    return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
  }

  console.log(`[cleanup] Deleted ${expired.length} expired image(s).`);
  return new Response(
    JSON.stringify({ deleted: expired.length, paths }),
    { status: 200 },
  );
});
