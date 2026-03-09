import imageCompression from "browser-image-compression";

/**
 * Compress an image file to under the target size (default 150KB).
 * Falls back to the original file if compression fails.
 */
export async function compressImage(
  file: File,
  maxSizeKB = 150
): Promise<File> {
  // Skip non-image files or already small files
  if (!file.type.startsWith("image/") || file.size <= maxSizeKB * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: maxSizeKB / 1024,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });
    return compressed as File;
  } catch (err) {
    console.error("Image compression failed, using original:", err);
    return file;
  }
}
