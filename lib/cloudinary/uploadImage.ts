import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export function uploadImageToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string
) {
  return new Promise<{ url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename.split(".")[0],
      },
      (error, result) => {
        if (error) return reject(error);
        if (result)
          resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}
export async function deleteFileFromCloudinary(public_id: string) {
  try {
    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Failed to delete from Cloudinary: ${result.result}`);
    }

    return { success: true, result };
  } catch (err) {
    console.error("❌ Cloudinary delete error:", err);
    throw err;
  }
}
