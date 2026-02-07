import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { OCR_PAGE_HARD_LIMIT } from '@/lib/pdfPreCheck';

interface ScannedDocWarningProps {
  open: boolean;
  fileName: string;
  pageCount: number;
  exceedsLimit: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export function ScannedDocWarning({
  open,
  fileName,
  pageCount,
  exceedsLimit,
  onContinue,
  onCancel,
}: ScannedDocWarningProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Scanned Document Detected
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                <span className="font-medium text-foreground">{fileName}</span> appears to
                be a scanned PDF ({pageCount} page{pageCount !== 1 ? 's' : ''}).
              </p>

              {exceedsLimit ? (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm">
                  <p className="font-medium text-destructive">
                    OCR is limited to {OCR_PAGE_HARD_LIMIT} pages
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    This document has {pageCount} pages, which exceeds the browser-based OCR limit.
                    Only the first {OCR_PAGE_HARD_LIMIT} pages will be processed.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    OCR processing is slow in the browser
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Processing {pageCount} page{pageCount !== 1 ? 's' : ''} may take several minutes.
                    Text extraction quality depends on scan quality.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            {exceedsLimit
              ? `Process First ${OCR_PAGE_HARD_LIMIT} Pages`
              : 'Continue with OCR'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
