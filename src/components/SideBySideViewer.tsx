import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SideBySideViewerProps {
  textA: string;
  textB: string;
  labelA: string;
  labelB: string;
  highlightText?: string;
  className?: string;
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

export function SideBySideViewer({ 
  textA, 
  textB, 
  labelA, 
  labelB, 
  highlightText,
  className 
}: SideBySideViewerProps) {
  const contentA = useMemo(() => {
    return highlightText ? highlightSearchText(textA, highlightText) : textA;
  }, [textA, highlightText]);

  const contentB = useMemo(() => {
    return highlightText ? highlightSearchText(textB, highlightText) : textB;
  }, [textB, highlightText]);

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground truncate">{labelA}</p>
        <ScrollArea className="h-[400px] rounded-lg border border-border bg-card">
          <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {contentA}
          </div>
        </ScrollArea>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground truncate">{labelB}</p>
        <ScrollArea className="h-[400px] rounded-lg border border-border bg-card">
          <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {contentB}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
