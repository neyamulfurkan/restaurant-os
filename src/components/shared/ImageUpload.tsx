// src/components/shared/ImageUpload.tsx

'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  currentImage?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  className?: string;
  disabled?: boolean;
}

const ImageUpload = React.forwardRef<HTMLDivElement, ImageUploadProps>(
  (
    {
      currentImage,
      onUpload,
      onRemove,
      
      folder = 'menu',
      maxSizeMB = 5,
      acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      className,
      disabled = false,
    },
    ref
  ) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [preview, setPreview] = React.useState<string | null>(
      currentImage || null
    );
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      setPreview(currentImage || null);
    }, [currentImage]);

    const validateFile = (file: File): string | null => {
      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        return `Invalid file type. Accepted formats: ${acceptedFormats
          .map((f) => f.split('/')[1])
          .join(', ')}`;
      }

      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      return null;
    };

    const uploadFile = async (file: File) => {
      setIsUploading(true);
      setError(null);

      try {
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          setIsUploading(false);
          return;
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        // Upload to local storage via API
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Set preview and notify parent
        setPreview(data.data.url);
        onUpload(data.data.url);
      } catch (err) {
        console.error('Upload error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to upload image'
        );
      } finally {
        setIsUploading(false);
      }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = event.dataTransfer.files?.[0];
      if (file) {
        uploadFile(file);
      }
    };

    const handleRemove = () => {
      setPreview(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onRemove) {
        onRemove();
      }
    };

    const handleClick = () => {
      if (!disabled && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div ref={ref} className={cn('w-full', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors',
            isDragging && 'border-primary-500 bg-primary-50',
            !isDragging && 'border-neutral-300 hover:border-neutral-400',
            disabled && 'cursor-not-allowed opacity-50',
            preview ? 'aspect-video' : 'aspect-video sm:aspect-[4/3]'
          )}
        >
          {preview ? (
            <>
              <Image
                src={preview}
                alt="Upload preview"
                fill
                className="object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/0 transition-colors hover:bg-black/40">
                  <div className="flex h-full items-center justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                      }}
                      className="opacity-0 transition-opacity hover:opacity-100"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              {isUploading ? (
                <>
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
                  <p className="text-sm text-neutral-600">Uploading...</p>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <ImageIcon className="h-6 w-6 text-neutral-400" />
                  </div>
                  <div className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-700">
                    <Upload className="h-4 w-4" />
                    <span>Click to upload or drag and drop</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {acceptedFormats.map((f) => f.split('/')[1]).join(', ')}{' '}
                    (max {maxSizeMB}MB)
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
ImageUpload.displayName = 'ImageUpload';

export { ImageUpload };