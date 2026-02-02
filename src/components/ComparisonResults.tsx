import { CheckCircle2, XCircle, FileText, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiffViewer } from './DiffViewer';
import { ComparisonResult } from '@/lib/textComparator';
import { DocumentExtractionResult } from '@/lib/documentExtractor';
import { cn } from '@/lib/utils';

interface ComparisonResultsProps {
  result: ComparisonResult;
  documentA: DocumentExtractionResult;
  documentB: DocumentExtractionResult;
  onReset: () => void;
}

export function ComparisonResults({
  result,
  documentA,
  documentB,
  onReset
}: ComparisonResultsProps) {

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <Card className={cn(
        "border-2",
        result.isExactMatch ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {result.isExactMatch ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-amber-500" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {result.isExactMatch ? 'Documents Match!' : 'Differences Found'}
                </h2>
                <p className="text-muted-foreground">
                  {result.isExactMatch 
                    ? 'The documents contain identical text content.'
                    : `${result.similarity}% similarity - see detailed comparison below.`}
                </p>
              </div>
            </div>
            <Button onClick={onReset}>
              Compare New Documents
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document A
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium truncate">{documentA.fileName}</p>
            <p className="text-muted-foreground">Type: {documentA.fileType.toUpperCase()}</p>
            {documentA.usedOCR && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Scan className="h-3 w-3" />
                OCR used (Confidence: {documentA.ocrConfidence?.toFixed(1)}%)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document B
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium truncate">{documentB.fileName}</p>
            <p className="text-muted-foreground">Type: {documentB.fileType.toUpperCase()}</p>
            {documentB.usedOCR && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Scan className="h-3 w-3" />
                OCR used (Confidence: {documentB.ocrConfidence?.toFixed(1)}%)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      {!result.isExactMatch && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparison Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{result.unchangedCount}</p>
                <p className="text-xs text-muted-foreground">Unchanged Words</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{result.addedCount}</p>
                <p className="text-xs text-muted-foreground">Added Words</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{result.removedCount}</p>
                <p className="text-xs text-muted-foreground">Removed Words</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diff Viewer */}
      {!result.isExactMatch && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detailed Differences</CardTitle>
            <p className="text-sm text-muted-foreground">
              <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-400 mr-2">Added text</span>
              <span className="inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400 line-through">Removed text</span>
            </p>
          </CardHeader>
          <CardContent>
            <DiffViewer differences={result.differences} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
