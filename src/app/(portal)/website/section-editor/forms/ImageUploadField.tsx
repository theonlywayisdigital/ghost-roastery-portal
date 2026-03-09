"use client";

import { useRef, useState } from "react";
import { FormField } from "./FormField";
import { compressImage } from "@/lib/compress-image";

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  roasterId: string;
}

export function ImageUploadField({ label, value, onChange, roasterId }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(rawFile: File) {
    setUploading(true);
    try {
      const file = await compressImage(rawFile);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roasterId", roasterId);
      formData.append("folder", "website");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onChange(data.url);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <FormField label={label}>
      <div className="space-y-2">
        {value && (
          <div className="relative rounded-lg overflow-hidden border border-neutral-200">
            <img src={value} alt="" className="w-full h-32 object-cover" />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute top-2 right-2 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-red-500 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading..." : value ? "Replace image" : "Upload image"}
        </button>
      </div>
    </FormField>
  );
}
