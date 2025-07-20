import React, { useCallback, useState } from 'react';
import { Card } from '../ui';

interface ImageUploadProps {
  onImageUpload: (_file: File, _imageData: ImageData) => void;
  className?: string;
}

export default function ImageUpload({
  onImageUpload,
  className = '',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please select an image file');
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Image file size must be less than 10MB');
        }

        // Create image and canvas to extract ImageData
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Unable to create canvas context');
        }

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = URL.createObjectURL(file);
        });

        // Set canvas size (max 1024px for performance)
        const maxSize = 1024;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image and extract ImageData
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // Clean up
        URL.revokeObjectURL(img.src);

        onImageUpload(file, imageData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while processing the image'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]!);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]!);
      }
    },
    [processFile]
  );

  return (
    <Card className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-black bg-gray-50' : 'border-gray-300'}
          ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() =>
          !isLoading && document.getElementById('file-input')?.click()
        }
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="text-gray-600">Processing image...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-black">
                {isDragging ? 'Drop image here' : 'Upload reference image'}
              </p>
              <p className="text-gray-600 mt-1">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Supports JPG, PNG, WebP • Max 10MB
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
