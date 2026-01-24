import { useState, useCallback } from 'react';
import { Shield, FileText, Scan, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/FileUploadZone';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ComparisonResults } from '@/components/ComparisonResults';
import { extractTextFromDocument, DocumentExtractionResult } from '@/lib/documentExtractor';
import { compareTexts, ComparisonResult } from '@/lib/textComparator';

type AppState = 'upload' | 'processing' | 'results';

interface ProcessingProgress {
  documentA: { progress: number; status: string };
  documentB: { progress: number; status: string };
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [forceOCR, setForceOCR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    documentA: { progress: 0, status: 'Waiting...' },
    documentB: { progress: 0, status: 'Waiting...' }
  });
  
  const [extractedA, setExtractedA] = useState<DocumentExtractionResult | null>(null);
  const [extractedB, setExtractedB] = useState<DocumentExtractionResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const handleCompare = useCallback(async () => {
    if (!fileA || !fileB) return;
    
    setError(null);
    setAppState('processing');
    setProcessingProgress({
      documentA: { progress: 0, status: 'Starting...' },
      documentB: { progress: 0, status: 'Waiting...' }
    });

    try {
      // Process Document A
      const resultA = await extractTextFromDocument(fileA, forceOCR, (progress, status) => {
        setProcessingProgress(prev => ({
          ...prev,
          documentA: { progress, status }
        }));
      });
      setExtractedA(resultA);

      // Process Document B
      setProcessingProgress(prev => ({
        ...prev,
        documentB: { progress: 0, status: 'Starting...' }
      }));
      
      const resultB = await extractTextFromDocument(fileB, forceOCR, (progress, status) => {
        setProcessingProgress(prev => ({
          ...prev,
          documentB: { progress, status }
        }));
      });
      setExtractedB(resultB);

      // Compare texts
      const comparison = compareTexts(resultA.text, resultB.text);
      setComparisonResult(comparison);
      setAppState('results');

    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during processing.');
      setAppState('upload');
    }
  }, [fileA, fileB, forceOCR]);

  const handleReset = useCallback(() => {
    setAppState('upload');
    setFileA(null);
    setFileB(null);
    setExtractedA(null);
    setExtractedB(null);
    setComparisonResult(null);
    setError(null);
  }, []);

  const canCompare = fileA && fileB;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DocCompare</h1>
              <p className="text-xs text-muted-foreground">Privacy-first document comparison</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Privacy Banner */}
        <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-medium text-foreground">100% Private Processing</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your documents never leave your device. All processing happens locally in your browser using client-side OCR and text extraction. No data is uploaded to any server.
              </p>
            </div>
          </div>
        </div>

        {appState === 'upload' && (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Select two PDF or Word documents to compare their text content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FileUploadZone
                    label="Document A"
                    file={fileA}
                    onFileSelect={setFileA}
                    onFileRemove={() => setFileA(null)}
                  />
                  <FileUploadZone
                    label="Document B"
                    file={fileB}
                    onFileSelect={setFileB}
                    onFileRemove={() => setFileB(null)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* OCR Option */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  OCR Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Force OCR Processing</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enable this for scanned documents. OCR will extract text from images in the PDF.
                    </p>
                  </div>
                  <Switch
                    checked={forceOCR}
                    onCheckedChange={setForceOCR}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compare Button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleCompare}
                disabled={!canCompare}
                className="px-8"
              >
                Compare Documents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {appState === 'processing' && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Documents</CardTitle>
              <CardDescription>
                Extracting text and performing comparison. This may take a moment for scanned documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProcessingStatus
                progress={processingProgress.documentA.progress}
                status={processingProgress.documentA.status}
                documentLabel="Document A"
              />
              <ProcessingStatus
                progress={processingProgress.documentB.progress}
                status={processingProgress.documentB.status}
                documentLabel="Document B"
              />
            </CardContent>
          </Card>
        )}

        {appState === 'results' && comparisonResult && extractedA && extractedB && (
          <ComparisonResults
            result={comparisonResult}
            documentA={extractedA}
            documentB={extractedB}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built with privacy in mind. All processing happens in your browser.</p>
            <p className="mt-1">No data is ever sent to external servers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
