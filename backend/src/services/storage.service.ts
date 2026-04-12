import { supabaseAdmin } from "../config/supabase";
import { config } from "../config";

// ── Upload a file buffer to Supabase Storage ─────────────────────────────────
export async function uploadFile(
  bucket: string,
  path: string,          // e.g. "listings/abc123/photo.jpg"
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimetype, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  // Return public URL for public buckets (listing-images, avatars)
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Delete a file from Supabase Storage ──────────────────────────────────────
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

// ── Generate a signed URL for private documents (expires in 1 hour) ──────────
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(config.buckets.documents)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) throw new Error(`Failed to generate signed URL: ${error?.message}`);
  return data.signedUrl;
}
