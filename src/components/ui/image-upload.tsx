"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface UploadedImage {
  url: string;
  publicId?: string;
}

interface ImageUploadProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  folder?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  folder = "products",
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (value.length + acceptedFiles.length > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploading(true);

      try {
        const uploadPromises = acceptedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", folder);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
          }

          const result = await response.json();
          return {
            url: result.data.url,
            publicId: result.data.publicId,
          };
        });

        const uploadedImages = await Promise.all(uploadPromises);
        onChange([...value, ...uploadedImages]);
        toast.success(`${uploadedImages.length} image(s) uploaded`);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast.error(error.message || "Failed to upload images");
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, maxImages, folder],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: disabled || uploading || value.length >= maxImages,
  });

  const removeImage = async (index: number) => {
    const imageToRemove = value[index];

    // Optionally delete from Cloudinary
    if (imageToRemove.publicId) {
      try {
        await fetch(
          `/api/upload?publicId=${encodeURIComponent(imageToRemove.publicId)}`,
          {
            method: "DELETE",
          },
        );
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }

    const newImages = value.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${disabled || uploading || value.length >= maxImages ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm">
              {isDragActive ? (
                <p className="text-primary font-medium">Drop the images here</p>
              ) : (
                <>
                  <p className="font-medium">
                    Drag & drop images here, or click to select
                  </p>
                  <p className="text-muted-foreground mt-1">
                    JPEG, PNG, WebP, GIF up to 10MB ({value.length}/{maxImages})
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {value.map((image, index) => (
            <div
              key={image.url}
              className="relative aspect-square rounded-lg overflow-hidden border group"
            >
              <Image
                src={image.url}
                alt={`Uploaded image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              {index === 0 && (
                <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple single image upload variant
interface SingleImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  disabled?: boolean;
  className?: string;
}

export function SingleImageUpload({
  value,
  onChange,
  folder = "avatars",
  disabled = false,
  className,
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);

      try {
        const file = acceptedFiles[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();
        onChange(result.data.url);
        toast.success("Image uploaded");
      } catch (error: any) {
        console.error("Upload error:", error);
        toast.error(error.message || "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [onChange, folder],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  return (
    <div className={className}>
      {value ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border group">
          <Image
            src={value}
            alt="Uploaded image"
            fill
            className="object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}
          `}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
