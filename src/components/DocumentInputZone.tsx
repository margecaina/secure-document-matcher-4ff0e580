import React, { useCallback, useState } from 'react';
import { Upload, FileCheck, X, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export type InputMode = 'file' | 'text';

interface DocumentInputZoneProps {
  label: string;
  file: File | null;
  customText: string;
  inputMode: InputMode;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onTextChange: (text: string) => void;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export function DocumentInputZone({
  label,
  file,
  customText,
  inputMode,
  onFileSelect,
  onFileRemove,
  onTextChange,
  onModeChange,
  disabled = false
}: DocumentInputZoneProps) {
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
      onModeChange('file');
    }
  }, [disabled, onFileSelect, onModeChange]);

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
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Tabs value={inputMode} onValueChange={(v) => onModeChange(v as InputMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="gap-2">
            <Upload className="h-3.5 w-3.5" />
            File
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <Type className="h-3.5 w-3.5" />
            Text
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="mt-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 min-h-[140px]",
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
                    PDF or Word files
                  </p>
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="mt-2">
          <Textarea
            placeholder="Paste or type your text here..."
            value={customText}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={disabled}
            className="min-h-[140px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            {customText.length > 0 ? `${customText.split(/\s+/).filter(w => w).length} words` : 'Enter text to compare'}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
