import React, { useCallback, useState } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
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
  }, [onFileSelect]);

  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    return validTypes.includes(file.type) || 
           file.name.toLowerCase().endsWith('.pdf') ||
           file.name.toLowerCase().endsWith('.docx') ||
           file.name.toLowerCase().endsWith('.doc');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 min-h-[120px]",
        isDragging && "border-primary bg-primary/5",
        file ? "border-primary/50 bg-primary/5" : "border-border hover:border-muted-foreground/50",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !file && "cursor-pointer hover:bg-muted/50"
      )}
    >
      {file && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFileRemove();
          }}
          className="absolute right-2 top-2 rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={disabled}
      />
      
      {file ? (
        <>
          <FileCheck className="h-8 w-8 text-primary" />
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="mt-2 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Click to upload</span> or drag
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {placeholder}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
