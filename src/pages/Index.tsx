import { useState, useCallback } from 'react';
import { Shield, FileText, Scan, Lock, ArrowRight, AlertCircle, Play, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadSlot } from '@/components/FileUploadSlot';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ComparisonResults } from '@/components/ComparisonResults';
import { PasswordDialog } from '@/components/PasswordDialog';
import { extractTextFromDocument, DocumentExtractionResult, PasswordRequiredError, IncorrectPasswordError } from '@/lib/documentExtractor';
import { compareTexts, ComparisonResult } from '@/lib/textComparator';
import { demoSetMatching, demoSetMismatched, createDemoFile } from '@/lib/demoDocuments';

type AppState = 'upload' | 'processing' | 'results';

interface ProcessingProgress {
  documentA: { progress: number; status: string };
  documentB: { progress: number; status: string };
}

interface PasswordRequest {
  file: File;
  documentLabel: 'A' | 'B';
  error?: string;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [searchText, setSearchText] = useState('');
  const [forceOCR, setForceOCR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    documentA: { progress: 0, status: 'Waiting...' },
    documentB: { progress: 0, status: 'Waiting...' }
  });
  
  const [extractedA, setExtractedA] = useState<DocumentExtractionResult | null>(null);
  const [extractedB, setExtractedB] = useState<DocumentExtractionResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [textSearchResult, setTextSearchResult] = useState<{ inA: boolean; inB: boolean; searchTerm: string } | null>(null);
  
  // Password handling state
  const [passwordRequest, setPasswordRequest] = useState<PasswordRequest | null>(null);
  const [passwordA, setPasswordA] = useState<string | undefined>(undefined);
  const [passwordB, setPasswordB] = useState<string | undefined>(undefined);
  
  // Demo mode state
  const [demoContent, setDemoContent] = useState<{ a: string; b: string } | null>(null);

  const processDocument = async (
    file: File,
    documentLabel: 'A' | 'B',
    password?: string
  ): Promise<DocumentExtractionResult> => {
    const progressKey = documentLabel === 'A' ? 'documentA' : 'documentB';
    
    try {
      const result = await extractTextFromDocument(file, forceOCR, (progress, status) => {
        setProcessingProgress(prev => ({
          ...prev,
          [progressKey]: { progress, status }
        }));
      }, password);
      return result;
    } catch (err) {
      if (err instanceof PasswordRequiredError || err instanceof IncorrectPasswordError) {
        return new Promise((resolve, reject) => {
          setPasswordRequest({
            file,
            documentLabel,
            error: err instanceof IncorrectPasswordError ? 'Incorrect password. Please try again.' : undefined
          });
          
          (window as any).__passwordCallback = { resolve, reject, documentLabel };
        });
      }
      throw err;
    }
  };
  
  const handlePasswordSubmit = async (password: string) => {
    if (!passwordRequest) return;
    
    const { file, documentLabel } = passwordRequest;
    const callback = (window as any).__passwordCallback;
    
    if (documentLabel === 'A') {
      setPasswordA(password);
    } else {
      setPasswordB(password);
    }
    
    setPasswordRequest(null);
    
    try {
      const result = await processDocument(file, documentLabel, password);
      callback?.resolve(result);
    } catch (err) {
      if (err instanceof PasswordRequiredError || err instanceof IncorrectPasswordError) {
        return;
      }
      callback?.reject(err);
    }
  };
  
  const handlePasswordCancel = () => {
    setPasswordRequest(null);
    setAppState('upload');
    const callback = (window as any).__passwordCallback;
    callback?.reject(new Error('Password entry cancelled'));
    delete (window as any).__passwordCallback;
  };

  const handleCompare = useCallback(async () => {
    if (!fileA || !fileB) return;
    
    setError(null);
    setAppState('processing');
    setProcessingProgress({
      documentA: { progress: 0, status: 'Starting...' },
      documentB: { progress: 0, status: 'Waiting...' }
    });
    
    setPasswordA(undefined);
    setPasswordB(undefined);

    try {
      const resultA = await processDocument(fileA, 'A', passwordA);
      setExtractedA(resultA);

      setProcessingProgress(prev => ({
        ...prev,
        documentB: { progress: 0, status: 'Starting...' }
      }));
      
      const resultB = await processDocument(fileB, 'B', passwordB);
      setExtractedB(resultB);

      const comparison = compareTexts(resultA.text, resultB.text);
      setComparisonResult(comparison);
      
      // Check text search if provided
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        setTextSearchResult({
          inA: resultA.text.toLowerCase().includes(searchLower),
          inB: resultB.text.toLowerCase().includes(searchLower),
          searchTerm: searchText.trim()
        });
      } else {
        setTextSearchResult(null);
      }
      
      setAppState('results');

    } catch (err) {
      console.error('Comparison error:', err);
      if ((err as Error).message !== 'Password entry cancelled') {
        setError(err instanceof Error ? err.message : 'An error occurred during processing.');
      }
      setAppState('upload');
    }
  }, [fileA, fileB, searchText, forceOCR, passwordA, passwordB]);

  const handleBackToUpload = useCallback(() => {
    setAppState('upload');
    // Keep files and search text - don't reset them
  }, []);

  const handleFullReset = useCallback(() => {
    setAppState('upload');
    setFileA(null);
    setFileB(null);
    setSearchText('');
    setExtractedA(null);
    setExtractedB(null);
    setComparisonResult(null);
    setTextSearchResult(null);
    setError(null);
    setDemoContent(null);
  }, []);
  
  const loadDemoSet = useCallback((demoSet: typeof demoSetMatching) => {
    const fileA = createDemoFile(demoSet.documentA.fileName, demoSet.documentA.content);
    const fileB = createDemoFile(demoSet.documentB.fileName, demoSet.documentB.content);
    setFileA(fileA);
    setFileB(fileB);
    setDemoContent({ a: demoSet.documentA.content, b: demoSet.documentB.content });
    setError(null);
  }, []);
  
  const runDemoComparison = useCallback(async () => {
    if (!demoContent || !fileA || !fileB) return;
    
    setError(null);
    setAppState('processing');
    setProcessingProgress({
      documentA: { progress: 0, status: 'Processing demo document...' },
      documentB: { progress: 0, status: 'Waiting...' }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    setProcessingProgress(prev => ({
      ...prev,
      documentA: { progress: 100, status: 'Complete' }
    }));
    
    const resultA: DocumentExtractionResult = {
      text: demoContent.a,
      fileName: fileA.name,
      fileType: 'pdf',
      usedOCR: false
    };
    setExtractedA(resultA);

    await new Promise(resolve => setTimeout(resolve, 500));
    setProcessingProgress(prev => ({
      ...prev,
      documentB: { progress: 100, status: 'Complete' }
    }));
    
    const resultB: DocumentExtractionResult = {
      text: demoContent.b,
      fileName: fileB.name,
      fileType: 'pdf',
      usedOCR: false
    };
    setExtractedB(resultB);

    const comparison = compareTexts(resultA.text, resultB.text);
    setComparisonResult(comparison);
    
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      setTextSearchResult({
        inA: resultA.text.toLowerCase().includes(searchLower),
        inB: resultB.text.toLowerCase().includes(searchLower),
        searchTerm: searchText.trim()
      });
    } else {
      setTextSearchResult(null);
    }
    
    setAppState('results');
  }, [demoContent, fileA, fileB, searchText]);

  const canCompare = !!fileA && !!fileB;

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
                Your documents never leave your device. All processing happens locally in your browser.
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
                  Upload two documents to compare them side by side.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FileUploadSlot
                    file={fileA}
                    onFileSelect={setFileA}
                    onFileRemove={() => setFileA(null)}
                    placeholder="First document (PDF/Word)"
                  />
                  <FileUploadSlot
                    file={fileB}
                    onFileSelect={setFileB}
                    onFileRemove={() => setFileB(null)}
                    placeholder="Second document (PDF/Word)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Text Search Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Text Search (Optional)
                </CardTitle>
                <CardDescription>
                  Check if specific text appears in the uploaded documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter text to search for in both documents..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                {searchText.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Will search for: "{searchText.length > 50 ? searchText.slice(0, 50) + '...' : searchText}"
                  </p>
                )}
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
                      Enable for scanned documents to extract text from images.
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
                onClick={demoContent ? runDemoComparison : handleCompare}
                disabled={!canCompare}
                className="px-8"
              >
                Compare Documents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Demo Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Try Demo Documents
                </CardTitle>
                <CardDescription>
                  Load sample documents to test the comparison feature.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => loadDemoSet(demoSetMatching)}
                    className="h-auto py-3 flex flex-col items-start text-left"
                  >
                    <span className="font-medium text-green-600 dark:text-green-400">✓ Matching Documents</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Two identical contract documents
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadDemoSet(demoSetMismatched)}
                    className="h-auto py-3 flex flex-col items-start text-left"
                  >
                    <span className="font-medium text-amber-600 dark:text-amber-400">✗ Mismatched Documents</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Contract with unauthorized changes
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                documentLabel={fileA?.name || 'Document 1'}
              />
              <ProcessingStatus
                progress={processingProgress.documentB.progress}
                status={processingProgress.documentB.status}
                documentLabel={fileB?.name || 'Document 2'}
              />
            </CardContent>
          </Card>
        )}

        {appState === 'results' && comparisonResult && extractedA && extractedB && (
          <div className="space-y-4">
            {/* Text Search Results */}
            {textSearchResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Text Search Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Searching for: <span className="font-medium text-foreground">"{textSearchResult.searchTerm}"</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg border ${textSearchResult.inA ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                      <p className="text-sm font-medium truncate">{extractedA.fileName}</p>
                      <p className={`text-xs mt-1 ${textSearchResult.inA ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {textSearchResult.inA ? '✓ Found' : '✗ Not found'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${textSearchResult.inB ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                      <p className="text-sm font-medium truncate">{extractedB.fileName}</p>
                      <p className={`text-xs mt-1 ${textSearchResult.inB ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {textSearchResult.inB ? '✓ Found' : '✗ Not found'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <ComparisonResults
              result={comparisonResult}
              documentA={extractedA}
              documentB={extractedB}
              onReset={handleFullReset}
            />
            
            {/* Back Button */}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBackToUpload}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Button>
            </div>
          </div>
        )}
      </main>
      
      {/* Password Dialog */}
      <PasswordDialog
        open={!!passwordRequest}
        fileName={passwordRequest?.file.name || ''}
        error={passwordRequest?.error}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
      />

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Built with privacy in mind. All processing happens in your browser.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
