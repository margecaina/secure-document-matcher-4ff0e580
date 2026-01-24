import { Change } from 'diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  differences: Change[];
  className?: string;
}

export function DiffViewer({ differences, className }: DiffViewerProps) {
  return (
    <ScrollArea className={cn("h-[400px] rounded-lg border border-border bg-card", className)}>
      <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {differences.map((part, index) => (
          <span
            key={index}
            className={cn(
              part.added && "bg-green-500/20 text-green-700 dark:text-green-400",
              part.removed && "bg-red-500/20 text-red-700 dark:text-red-400 line-through"
            )}
          >
            {part.value}
          </span>
        ))}
      </div>
    </ScrollArea>
  );
}
