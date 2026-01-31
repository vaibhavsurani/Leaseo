import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: string | Buffer,
  options?: {
    folder?: string;
    transformation?: any[];
    resourceType?: "image" | "video" | "raw" | "auto";
  },
): Promise<CloudinaryUploadResult> {
  const uploadOptions = {
    folder: options?.folder || "authnext",
    resource_type: options?.resourceType || "auto",
    transformation: options?.transformation,
  };

  return new Promise((resolve, reject) => {
    if (typeof file === "string") {
      // If file is a base64 string or URL
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result as CloudinaryUploadResult);
      });
    } else {
      // If file is a Buffer
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result as CloudinaryUploadResult);
        },
      );
      uploadStream.end(file);
    }
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// Generate optimized image URL
export function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: number;
  },
): string {
  return cloudinary.url(publicId, {
    width: options?.width,
    height: options?.height,
    crop: options?.crop || "fill",
    quality: options?.quality || "auto",
    fetch_format: "auto",
    secure: true,
  });
}
