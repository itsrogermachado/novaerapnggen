import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_REQUEST = 20;

function validateApiKey(request: Request): boolean {
  const key = request.headers.get("x-api-key");
  const expected = process.env.DISCORD_BOT_API_KEY;
  if (!expected) {
    console.error("[discord-images] DISCORD_BOT_API_KEY not configured");
    return false;
  }
  return key === expected;
}

export const APIRoute = createAPIFileRoute("/api/discord-images")({
  // GET — list active (non-expired) images
  GET: async ({ request }) => {
    const hasApiKey = validateApiKey(request);

    if (!hasApiKey) {
      // Check for Supabase auth token
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("discord_images")
      .select("id, image_url, uploaded_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("[discord-images] GET error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch images" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ images: data }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },

  // POST — upload images (Discord bot)
  POST: async ({ request }) => {
    if (!validateApiKey(request)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid multipart/form-data body" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const files = formData.getAll("images") as File[];
    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided. Use field name 'images'." }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_FILES_PER_REQUEST} images per request` }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }

    const uploaded: { id: string; image_url: string; expires_at: string }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: invalid type '${file.type}'. Allowed: png, jpeg, webp`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }

      const ext = file.name.split(".").pop() || "png";
      const storagePath = `bot/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("discord-images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[discord-images] Storage upload error:", uploadError);
        errors.push(`${file.name}: upload failed`);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("discord-images")
        .getPublicUrl(storagePath);

      const { data: row, error: insertError } = await supabaseAdmin
        .from("discord_images")
        .insert({
          image_url: urlData.publicUrl,
          storage_path: storagePath,
        })
        .select("id, image_url, expires_at")
        .single();

      if (insertError) {
        console.error("[discord-images] DB insert error:", insertError);
        // Clean up orphaned storage file
        await supabaseAdmin.storage.from("discord-images").remove([storagePath]);
        errors.push(`${file.name}: database insert failed`);
        continue;
      }

      uploaded.push(row);
    }

    const status = uploaded.length > 0 ? 200 : 400;
    return new Response(
      JSON.stringify({
        success: uploaded.length > 0,
        uploaded,
        errors: errors.length > 0 ? errors : undefined,
        summary: `${uploaded.length}/${files.length} uploaded successfully`,
      }),
      { status, headers: { "content-type": "application/json" } },
    );
  },

  // DELETE — clean up expired images
  DELETE: async ({ request }) => {
    if (!validateApiKey(request)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    }

    const { data: expired, error: fetchError } = await supabaseAdmin
      .from("discord_images")
      .select("id, storage_path")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("[discord-images] Fetch expired error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expired images" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired images to clean up", deleted: 0 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Delete from storage
    const paths = expired.map((img) => img.storage_path);
    const { error: storageError } = await supabaseAdmin.storage
      .from("discord-images")
      .remove(paths);

    if (storageError) {
      console.error("[discord-images] Storage cleanup error:", storageError);
    }

    // Delete from database
    const ids = expired.map((img) => img.id);
    const { error: dbError } = await supabaseAdmin
      .from("discord_images")
      .delete()
      .in("id", ids);

    if (dbError) {
      console.error("[discord-images] DB cleanup error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to delete records" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ message: "Cleanup complete", deleted: expired.length }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
});
