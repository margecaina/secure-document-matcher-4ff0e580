import { Change } from 'diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface DiffViewerProps {
  differences: Change[];
  className?: string;
  highlightText?: string;
}

function highlightSearchText(text: string, searchText: string): React.ReactNode[] {
  if (!searchText.trim()) return [text];
  
  const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === searchText.toLowerCase()) {
      return (
        <mark key={i} className="bg-yellow-400/60 dark:bg-yellow-500/40 text-foreground rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function DiffViewer({ differences, className, highlightText }: DiffViewerProps) {
  const renderedContent = useMemo(() => {
    return differences.map((part, index) => {
      const content = highlightText ? highlightSearchText(part.value, highlightText) : part.value;
      
      return (
        <span
          key={index}
          className={cn(
            part.added && "bg-green-500/20 text-green-700 dark:text-green-400",
            part.removed && "bg-red-500/20 text-red-700 dark:text-red-400 line-through"
          )}
        >
          {content}
        </span>
      );
    });
  }, [differences, highlightText]);

  return (
    <ScrollArea className={cn("h-[400px] rounded-lg border border-border bg-card", className)}>
      <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {renderedContent}
      </div>
    </ScrollArea>
  );
}
