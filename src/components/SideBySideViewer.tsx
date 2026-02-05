import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Change } from 'diff';

interface SideBySideViewerProps {
  differences: Change[];
  labelA: string;
  labelB: string;
  highlightText?: string;
  className?: string;
}

function highlightSearchInText(text: string, searchText: string): React.ReactNode[] {
  if (!searchText.trim()) return [text];
  
  const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === searchText.toLowerCase()) {
      return (
        <mark key={i} className="bg-yellow-400 dark:bg-yellow-500 text-foreground rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function SideBySideViewer({ 
  differences,
  labelA, 
  labelB, 
  highlightText,
  className 
}: SideBySideViewerProps) {
  // Build content for document A (original) - shows unchanged + removed
  const contentA = useMemo(() => {
    return differences.map((part, index) => {
      // Skip added parts for document A
      if (part.added) return null;
      
      const text = part.value;
      const content = highlightText ? highlightSearchInText(text, highlightText) : text;
      
      if (part.removed) {
        return (
          <span
            key={index}
            className="bg-red-500/20 text-red-700 dark:text-red-400 line-through"
          >
            {content}
          </span>
        );
      }
      
      return <span key={index}>{content}</span>;
    });
  }, [differences, highlightText]);

  // Build content for document B (new) - shows unchanged + added
  const contentB = useMemo(() => {
    return differences.map((part, index) => {
      // Skip removed parts for document B
      if (part.removed) return null;
      
      const text = part.value;
      const content = highlightText ? highlightSearchInText(text, highlightText) : text;
      
      if (part.added) {
        return (
          <span
            key={index}
            className="bg-green-500/20 text-green-700 dark:text-green-400"
          >
            {content}
          </span>
        );
      }
      
      return <span key={index}>{content}</span>;
    });
  }, [differences, highlightText]);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground truncate">{labelA}</p>
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">Original</span>
        </div>
        <ScrollArea className="h-[400px] rounded-lg border border-border bg-card">
          <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {contentA}
          </div>
        </ScrollArea>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground truncate">{labelB}</p>
          <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Modified</span>
        </div>
        <ScrollArea className="h-[400px] rounded-lg border border-border bg-card">
          <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {contentB}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
