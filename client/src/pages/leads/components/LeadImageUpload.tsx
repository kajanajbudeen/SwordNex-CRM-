import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, X, AlertCircle } from 'lucide-react';
import { apiClient } from '../../../api/client';

interface LeadImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  firstName?: string;
  lastName?: string;
  disabled?: boolean;
}

export const LeadImageUpload: React.FC<LeadImageUploadProps> = ({
  value,
  onChange,
  firstName = '',
  lastName = '',
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const f = firstName.trim().charAt(0) || '';
    const l = lastName.trim().charAt(0) || '';
    if (!f && !l) return 'LD';
    return `${f}${l}`.toUpperCase();
  };

  const handleFile = async (file: File) => {
    setUploadError(null);

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('Image exceeds 5MB size limit.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await apiClient.post('/leads/upload-image', {
        image: base64Data,
        fileName: file.name,
      });

      if (res.success && res.data?.url) {
        onChange(res.data.url);
      } else {
        throw new Error(res.error || 'Failed to upload photo');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fullImageUrl = value
    ? value.startsWith('http') || value.startsWith('data:')
      ? value
      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${value}`
    : null;

  return (
    <div className="flex items-center space-x-3">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Compact Avatar Thumbnail */}
      <div
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border transition flex-shrink-0 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/30'
            : fullImageUrl
            ? 'border-slate-700 hover:border-slate-500 bg-slate-800'
            : 'border-slate-700 hover:border-cyan-500/60 bg-slate-800/80'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        title={fullImageUrl ? 'Click to change avatar' : 'Click or drop image to upload avatar'}
      >
        {fullImageUrl ? (
          <img
            src={fullImageUrl}
            alt="Lead avatar"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 font-medium text-xs">
            {getInitials()}
          </div>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          </div>
        )}

        {/* Small camera badge if no photo */}
        {!fullImageUrl && !isUploading && (
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        )}
      </div>

      {/* Upload & Remove Text Actions */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2 text-xs">
          {fullImageUrl ? (
            <>
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-300 hover:text-white font-medium transition disabled:opacity-50"
              >
                Change photo
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={handleRemove}
                className="text-rose-400 hover:text-rose-300 font-medium transition disabled:opacity-50"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition disabled:opacity-50 flex items-center space-x-1"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              <span>{isUploading ? 'Uploading...' : 'Add photo'}</span>
            </button>
          )}
        </div>

        {uploadError && (
          <div className="flex items-center space-x-1 mt-0.5 text-rose-400 text-[11px]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
