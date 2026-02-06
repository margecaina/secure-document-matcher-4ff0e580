import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, FileCheck, X, Image, FileText, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadSlotProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FileUploadSlot({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
  placeholder = "Drop file here"
}: FileUploadSlotProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate thumbnail when file changes
  useEffect(() => {
    if (!file) {
      setThumbnailUrl(null);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isImage) {
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    if (isPDF) {
      // Render first page as thumbnail
      let cancelled = false;
      (async () => {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (!cancelled) {
            setThumbnailUrl(canvas.toDataURL('image/png'));
          }
        } catch {
          // Password-protected or corrupt — just skip thumbnail
        }
      })();
      return () => { cancelled = true; };
    }

    // Word docs — no thumbnail, will show icon
    setThumbnailUrl(null);
  }, [file]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      onFileSelect(droppedFile);
    }
  }, [disabled, onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      onFileSelect(selectedFile);
    }
    // Reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileSelect]);

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff'];
    const name = file.name.toLowerCase();
    return validTypes.includes(file.type) || 
           imageTypes.includes(file.type) ||
           name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.doc') ||
           name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') ||
           name.endsWith('.webp') || name.endsWith('.bmp') || name.endsWith('.tiff');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileIcon className="h-8 w-8 text-blue-500" />;
    return <Image className="h-8 w-8 text-primary" />;
  };

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFileRemove();
  }, [onFileRemove]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 min-h-[140px] overflow-hidden",
        isDragging && "border-primary bg-primary/5",
        file ? "border-primary/50" : "border-border hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !file && "cursor-pointer hover:bg-muted/50"
      )}
    >
      {/* Remove button — always visible when file present */}
      {file && !disabled && (
        <button
          onClick={handleRemoveClick}
          className="absolute right-2 top-2 z-20 rounded-full p-1.5 bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-sm transition-colors"
          title="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      
      {/* Hidden file input — only active when no file selected */}
      {!file && (
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp,.tiff,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0 z-10"
          disabled={disabled}
        />
      )}
      
      {file ? (
        <div className="flex flex-col items-center gap-2 p-3 w-full">
          {/* Thumbnail or icon */}
          {thumbnailUrl ? (
            <div className="w-full h-[80px] flex items-center justify-center">
              <img 
                src={thumbnailUrl} 
                alt="Preview" 
                className="max-h-[80px] max-w-full object-contain rounded"
              />
            </div>
          ) : (
            getFileIcon()
          )}
          {/* File info */}
          <div className="text-center w-full min-w-0">
            <p className="text-xs font-medium text-foreground truncate px-2">
              {file.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 p-4">
          <Upload className="h-7 w-7 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium text-primary">Click</span>, drag, or <span className="font-medium text-primary">Ctrl+V</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            PDF · Word · Image
          </p>
        </div>
      )}
    </div>
  );
}
