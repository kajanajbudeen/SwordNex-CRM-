import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    const f = firstName.trim().charAt(0) || 'L';
    const l = lastName.trim().charAt(0) || '';
    return `${f}${l}`.toUpperCase();
  };

  const handleFile = async (file: File) => {
    setUploadError(null);

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('File size exceeds 5MB limit. Please select a smaller image.');
      return;
    }

    setIsUploading(true);
    try {
      // Read file as base64 data URL
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Upload to backend
      const res = await apiClient.post('/leads/upload-image', {
        image: base64Data,
        fileName: file.name,
      });

      if (res.success && res.data?.url) {
        onChange(res.data.url);
      } else {
        throw new Error(res.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Please try again.');
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
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Avatar circular preview dropzone */}
      <div
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative w-24 h-24 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden border-2 transition group flex-shrink-0 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/40 shadow-glow-cyan'
            : fullImageUrl
            ? 'border-slate-700 hover:border-cyan-500/80 bg-slate-900'
            : 'border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/60'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        title="Click or drag image to upload lead avatar"
      >
        {fullImageUrl ? (
          <img
            src={fullImageUrl}
            alt="Lead avatar preview"
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-slate-300">
            <span className="text-xl font-bold font-mono tracking-wider text-cyan-400">
              {getInitials()}
            </span>
            <Camera className="w-4 h-4 text-slate-400 mt-1 opacity-70 group-hover:opacity-100 transition" />
          </div>
        )}

        {/* Hover overlay */}
        {!disabled && !isUploading && (
          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] font-medium text-cyan-300">
            <Upload className="w-4 h-4 mb-0.5" />
            <span>{fullImageUrl ? 'Replace' : 'Upload'}</span>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-[10px] text-cyan-300">
            <RefreshCw className="w-5 h-5 animate-spin mb-1 text-cyan-400" />
            <span>Uploading...</span>
          </div>
        )}
      </div>

      {/* Upload info and action buttons */}
      <div className="flex-1 text-center sm:text-left">
        <h4 className="text-xs font-semibold text-slate-200">Lead Profile Picture</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Supports JPEG, PNG, or WebP up to 5MB. Stored securely on cloud storage.
        </p>

        <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5">
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>{value ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {value && (
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={handleRemove}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center space-x-1 transition disabled:opacity-50"
              title="Remove profile image"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {uploadError && (
          <div className="flex items-center space-x-1.5 mt-2 text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
