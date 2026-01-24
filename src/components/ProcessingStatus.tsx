import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface ProcessingStatusProps {
  progress: number;
  status: string;
  documentLabel: string;
}

export function ProcessingStatus({ progress, status, documentLabel }: ProcessingStatusProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">{documentLabel}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
