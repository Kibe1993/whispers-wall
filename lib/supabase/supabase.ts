// lib/supabase/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_KEY as string
);

// 👇 one place to change bucket name
const BUCKET_NAME = "my_bucket";

export async function uploadFileToSupabase(
  buffer: Buffer,
  filename: string,
  folder: string
): Promise<{ url: string; public_id: string }> {
  const filePath = `${folder}/${uuidv4()}-${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/octet-stream",
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl, // direct access
    public_id: filePath, // store this for deletion
  };
}

/**
 * Deletes a file from Supabase storage
 * @param filePath The exact path in Supabase bucket, e.g. 'topics/Life/file.pdf'
 */
export async function deleteFileFromSupabase(filePath: string) {
  console.log("🗑 Attempting to delete:", filePath);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error("❌ [Supabase] Delete error:", error.message);
    throw error;
  }

  console.log("✅ Deleted from Supabase:", data);
  return data;
}
