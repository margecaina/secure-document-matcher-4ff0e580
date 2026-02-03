import { useState, useCallback } from 'react';
import { Shield, FileText, Scan, Lock, ArrowRight, AlertCircle, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentSlot, AddDocumentSlot } from '@/components/DocumentSlot';
import { ReferenceTextInput } from '@/components/ReferenceTextInput';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ComparisonResults } from '@/components/ComparisonResults';
import { PasswordDialog } from '@/components/PasswordDialog';
import { extractTextFromDocument, DocumentExtractionResult, PasswordRequiredError, IncorrectPasswordError } from '@/lib/documentExtractor';
import { compareTexts, ComparisonResult } from '@/lib/textComparator';
import { demoSetMatching, demoSetMismatched, createDemoFile } from '@/lib/demoDocuments';

type AppState = 'upload' | 'processing' | 'results';

interface DocumentInput {
  id: string;
  file: File | null;
}

interface ProcessingProgress {
  [key: string]: { progress: number; status: string };
}

interface PasswordRequest {
  file: File;
  documentId: string;
  error?: string;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [documents, setDocuments] = useState<DocumentInput[]>([
    { id: 'doc-1', file: null },
    { id: 'doc-2', file: null }
  ]);
  const [referenceText, setReferenceText] = useState('');
  const [forceOCR, setForceOCR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({});
  const [extractedResults, setExtractedResults] = useState<Map<string, DocumentExtractionResult>>(new Map());
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  
  // Password handling state
  const [passwordRequest, setPasswordRequest] = useState<PasswordRequest | null>(null);
  const [passwords, setPasswords] = useState<Map<string, string>>(new Map());
  
  // Demo mode state
  const [demoContent, setDemoContent] = useState<Map<string, string> | null>(null);

  const addDocument = useCallback(() => {
    if (documents.length >= 3) return;
    const newId = `doc-${Date.now()}`;
    setDocuments(prev => [...prev, { id: newId, file: null }]);
  }, [documents.length]);

  const removeDocument = useCallback((id: string) => {
    if (documents.length <= 2) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, [documents.length]);

  const updateDocumentFile = useCallback((id: string, file: File | null) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, file } : d));
    if (!file) {
      setDemoContent(null);
    }
  }, []);

  const processDocument = async (
    file: File,
    documentId: string,
    password?: string
  ): Promise<DocumentExtractionResult> => {
    try {
      const result = await extractTextFromDocument(file, forceOCR, (progress, status) => {
        setProcessingProgress(prev => ({
          ...prev,
          [documentId]: { progress, status }
        }));
      }, password);
      return result;
    } catch (err) {
      if (err instanceof PasswordRequiredError || err instanceof IncorrectPasswordError) {
        return new Promise((resolve, reject) => {
          setPasswordRequest({
            file,
            documentId,
            error: err instanceof IncorrectPasswordError ? 'Incorrect password. Please try again.' : undefined
          });
          
          (window as any).__passwordCallback = { resolve, reject, documentId };
        });
      }
      throw err;
    }
  };
  
  const handlePasswordSubmit = async (password: string) => {
    if (!passwordRequest) return;
    
    const { file, documentId } = passwordRequest;
    const callback = (window as any).__passwordCallback;
    
    setPasswords(prev => new Map(prev).set(documentId, password));
    setPasswordRequest(null);
    
    try {
      const result = await processDocument(file, documentId, password);
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
    const filledDocuments = documents.filter(d => d.file);
    const hasReferenceText = referenceText.trim().length > 0;
    const totalInputs = filledDocuments.length + (hasReferenceText ? 1 : 0);
    
    if (totalInputs < 2) return;
    
    setError(null);
    setAppState('processing');
    
    // Initialize progress
    const initialProgress: ProcessingProgress = {};
    filledDocuments.forEach(d => {
      initialProgress[d.id] = { progress: 0, status: 'Waiting...' };
    });
    if (hasReferenceText) {
      initialProgress['reference'] = { progress: 0, status: 'Waiting...' };
    }
    setProcessingProgress(initialProgress);
    setPasswords(new Map());

    try {
      const results = new Map<string, DocumentExtractionResult>();

      // Process documents
      for (const doc of filledDocuments) {
        setProcessingProgress(prev => ({
          ...prev,
          [doc.id]: { progress: 0, status: 'Starting...' }
        }));

        // Check for demo content
        if (demoContent && demoContent.has(doc.id)) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setProcessingProgress(prev => ({
            ...prev,
            [doc.id]: { progress: 100, status: 'Complete' }
          }));
          results.set(doc.id, {
            text: demoContent.get(doc.id)!,
            fileName: doc.file!.name,
            fileType: 'pdf',
            usedOCR: false
          });
        } else {
          const result = await processDocument(doc.file!, doc.id, passwords.get(doc.id));
          results.set(doc.id, result);
        }
      }

      // Process reference text
      if (hasReferenceText) {
        setProcessingProgress(prev => ({
          ...prev,
          reference: { progress: 50, status: 'Processing text...' }
        }));
        await new Promise(resolve => setTimeout(resolve, 150));
        setProcessingProgress(prev => ({
          ...prev,
          reference: { progress: 100, status: 'Complete' }
        }));
        results.set('reference', {
          text: referenceText,
          fileName: 'Reference Text',
          fileType: 'word',
          usedOCR: false
        });
      }

      setExtractedResults(results);

      // Get comparison texts (use first two for now)
      const resultEntries = Array.from(results.entries());
      if (resultEntries.length >= 2) {
        const [first, second] = resultEntries;
        const comparison = compareTexts(first[1].text, second[1].text);
        setComparisonResult(comparison);
      }
      
      setAppState('results');

    } catch (err) {
      console.error('Comparison error:', err);
      if ((err as Error).message !== 'Password entry cancelled') {
        setError(err instanceof Error ? err.message : 'An error occurred during processing.');
      }
      setAppState('upload');
    }
  }, [documents, referenceText, forceOCR, passwords, demoContent]);

  const handleReset = useCallback(() => {
    setAppState('upload');
    setDocuments([
      { id: 'doc-1', file: null },
      { id: 'doc-2', file: null }
    ]);
    setReferenceText('');
    setExtractedResults(new Map());
    setComparisonResult(null);
    setError(null);
    setDemoContent(null);
  }, []);

  const handleBackToUpload = useCallback(() => {
    setAppState('upload');
    setComparisonResult(null);
    setExtractedResults(new Map());
  }, []);
  
  const loadDemoSet = useCallback((demoSet: typeof demoSetMatching) => {
    const fileA = createDemoFile(demoSet.documentA.fileName, demoSet.documentA.content);
    const fileB = createDemoFile(demoSet.documentB.fileName, demoSet.documentB.content);
    
    const newDocs = [
      { id: 'doc-1', file: fileA },
      { id: 'doc-2', file: fileB }
    ];
    setDocuments(newDocs);
    
    const demoMap = new Map<string, string>();
    demoMap.set('doc-1', demoSet.documentA.content);
    demoMap.set('doc-2', demoSet.documentB.content);
    setDemoContent(demoMap);
    setError(null);
  }, []);

  const filledDocuments = documents.filter(d => d.file);
  const hasReferenceText = referenceText.trim().length > 0;
  const totalInputs = filledDocuments.length + (hasReferenceText ? 1 : 0);
  const canCompare = totalInputs >= 2;

  // Get first two results for display
  const resultEntries = Array.from(extractedResults.entries());
  const extractedA = resultEntries[0]?.[1] || null;
  const extractedB = resultEntries[1]?.[1] || null;

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

            {/* Documents Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Documents
                </CardTitle>
                <CardDescription>
                  Upload 2-3 documents to compare. Supports PDF and Word files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {documents.map((doc, index) => (
                    <DocumentSlot
                      key={doc.id}
                      file={doc.file}
                      onFileSelect={(file) => updateDocumentFile(doc.id, file)}
                      onFileRemove={() => updateDocumentFile(doc.id, null)}
                      onRemoveSlot={() => removeDocument(doc.id)}
                      canRemove={documents.length > 2}
                      placeholder={`Document ${index + 1}`}
                    />
                  ))}
                  {documents.length < 3 && (
                    <AddDocumentSlot onClick={addDocument} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reference Text Section */}
            <Card>
              <CardContent className="pt-6">
                <ReferenceTextInput
                  value={referenceText}
                  onChange={setReferenceText}
                />
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
                onClick={handleCompare}
                disabled={!canCompare}
                className="px-8"
              >
                Compare {totalInputs >= 2 ? `(${totalInputs} inputs)` : ''}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {!canCompare && (
              <p className="text-center text-sm text-muted-foreground">
                Add at least 2 inputs (documents or reference text) to compare
              </p>
            )}
            
            {/* Demo Section */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Try Demo
                </CardTitle>
                <CardDescription>
                  Load sample documents to test the comparison.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => loadDemoSet(demoSetMatching)}
                    className="h-auto py-3 flex flex-col items-start text-left"
                  >
                    <span className="font-medium text-green-600 dark:text-green-400">✓ Matching</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Identical contracts
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadDemoSet(demoSetMismatched)}
                    className="h-auto py-3 flex flex-col items-start text-left"
                  >
                    <span className="font-medium text-amber-600 dark:text-amber-400">✗ Mismatched</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Contract with changes
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
              <CardTitle>Processing</CardTitle>
              <CardDescription>
                Extracting text and comparing. This may take a moment for scanned documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(processingProgress).map(([id, progress]) => (
                <ProcessingStatus
                  key={id}
                  progress={progress.progress}
                  status={progress.status}
                  documentLabel={id === 'reference' ? 'Reference Text' : documents.find(d => d.id === id)?.file?.name || id}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {appState === 'results' && comparisonResult && extractedA && extractedB && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleBackToUpload}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Back to Documents
            </Button>
            <ComparisonResults
              result={comparisonResult}
              documentA={extractedA}
              documentB={extractedB}
              onReset={handleReset}
            />
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
