"use client";

import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Film, Loader2 } from "lucide-react";

export function MediaUploader({
  mediaUrls,
  onChange,
}: {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError(null);

    // Check limits
    const hasVideo = mediaUrls.some((u) => u.match(/\.(mp4|mov)$/i));
    const newFiles = Array.from(files);
    const hasNewVideo = newFiles.some((f) => f.type.startsWith("video/"));

    if (hasVideo || hasNewVideo) {
      if (mediaUrls.length > 0 && hasNewVideo) {
        setError("Videos must be uploaded alone (max 1 video per post)");
        return;
      }
      if (newFiles.length > 1 && hasNewVideo) {
        setError("Only 1 video per post is allowed");
        return;
      }
    }

    if (mediaUrls.length + newFiles.length > 10) {
      setError("Maximum 10 images per post");
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/social/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }
        const { url } = await res.json();
        uploadedUrls.push(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        break;
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...mediaUrls, ...uploadedUrls]);
    }
    setUploading(false);
  }

  function removeMedia(index: number) {
    onChange(mediaUrls.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Drop files or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP, GIF, MP4 — max 10MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      {/* Media grid */}
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {mediaUrls.map((url, i) => {
            const isVideo = !!url.match(/\.(mp4|mov)$/i);
            return (
              <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                {isVideo ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-slate-400" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMedia(i);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                {isVideo && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                    Video
                  </span>
                )}
              </div>
            );
          })}
          {mediaUrls.length < 10 && !mediaUrls.some((u) => u.match(/\.(mp4|mov)$/i)) && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-slate-300 transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
