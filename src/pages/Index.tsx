import { useState, useCallback, useMemo } from 'react';
import { Shield, FileText, Scan, Lock, ArrowRight, AlertCircle, Play, Search, ArrowLeft, Columns, AlignJustify } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { FileUploadSlot } from '@/components/FileUploadSlot';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { ComparisonResults } from '@/components/ComparisonResults';
import { PasswordDialog } from '@/components/PasswordDialog';
import { SideBySideViewer } from '@/components/SideBySideViewer';
import { extractTextFromDocument, DocumentExtractionResult, PasswordRequiredError, IncorrectPasswordError } from '@/lib/documentExtractor';
import { compareTexts, ComparisonResult } from '@/lib/textComparator';
import { demoSetMatching, demoSetMismatched, createDemoFile } from '@/lib/demoDocuments';

type AppState = 'upload' | 'processing' | 'results';
type ViewMode = 'inline' | 'sidebyside';

interface ProcessingProgress {
  documentA: { progress: number; status: string };
  documentB: { progress: number; status: string };
  documentC: { progress: number; status: string };
}

interface PasswordRequest {
  file: File;
  documentLabel: 'A' | 'B' | 'C';
  error?: string;
}

// Single document viewer with search highlighting
function SingleDocViewer({ text, highlightText }: { text: string; highlightText?: string }) {
  const content = useMemo(() => {
    if (!highlightText?.trim()) return text;
    
    const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      if (part.toLowerCase() === highlightText.toLowerCase()) {
        return (
          <mark key={i} className="bg-yellow-400/60 dark:bg-yellow-500/40 text-foreground rounded px-0.5">
            {part}
          </mark>
        );
      }
      return part;
    });
  }, [text, highlightText]);

  return (
    <ScrollArea className="h-[400px] rounded-lg border border-border bg-card">
      <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </ScrollArea>
  );
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>('upload');
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [fileC, setFileC] = useState<File | null>(null);
  const [searchText, setSearchText] = useState('');
  const [resultsSearchText, setResultsSearchText] = useState('');
  const [forceOCR, setForceOCR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('inline');
  
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    documentA: { progress: 0, status: 'Waiting...' },
    documentB: { progress: 0, status: 'Waiting...' },
    documentC: { progress: 0, status: 'Waiting...' }
  });
  
  const [extractedA, setExtractedA] = useState<DocumentExtractionResult | null>(null);
  const [extractedB, setExtractedB] = useState<DocumentExtractionResult | null>(null);
  const [extractedC, setExtractedC] = useState<DocumentExtractionResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [textSearchResult, setTextSearchResult] = useState<{ inA: boolean; inB: boolean; inC: boolean; searchTerm: string } | null>(null);
  const [singleDocMode, setSingleDocMode] = useState(false);
  
  // Password handling state
  const [passwordRequest, setPasswordRequest] = useState<PasswordRequest | null>(null);
  const [passwordA, setPasswordA] = useState<string | undefined>(undefined);
  const [passwordB, setPasswordB] = useState<string | undefined>(undefined);
  const [passwordC, setPasswordC] = useState<string | undefined>(undefined);
  
  // Demo mode state
  const [demoContent, setDemoContent] = useState<{ a: string; b: string } | null>(null);

  // Active search text (from results page if available, otherwise from upload)
  const activeSearchText = resultsSearchText || searchText;

  const processDocument = async (
    file: File,
    documentLabel: 'A' | 'B' | 'C',
    password?: string
  ): Promise<DocumentExtractionResult> => {
    const progressKey = documentLabel === 'A' ? 'documentA' : documentLabel === 'B' ? 'documentB' : 'documentC';
    
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
    } else if (documentLabel === 'B') {
      setPasswordB(password);
    } else {
      setPasswordC(password);
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

  // Update search results when resultsSearchText changes
  const updateSearchResults = useCallback((search: string) => {
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      setTextSearchResult({
        inA: extractedA ? extractedA.text.toLowerCase().includes(searchLower) : false,
        inB: extractedB ? extractedB.text.toLowerCase().includes(searchLower) : false,
        inC: extractedC ? extractedC.text.toLowerCase().includes(searchLower) : false,
        searchTerm: search.trim()
      });
    } else {
      setTextSearchResult(null);
    }
  }, [extractedA, extractedB, extractedC]);

  const handleResultsSearchChange = useCallback((value: string) => {
    setResultsSearchText(value);
    updateSearchResults(value);
  }, [updateSearchResults]);

  const handleCompare = useCallback(async () => {
    const docCount = [fileA, fileB, fileC].filter(Boolean).length;
    // Allow single doc mode if only one file and search text exists
    const isSingleDocMode = docCount === 1 && searchText.trim();
    setSingleDocMode(!!isSingleDocMode);
    
    if (!isSingleDocMode && docCount < 2) return;
    
    setError(null);
    setAppState('processing');
    setResultsSearchText(searchText); // Copy search text to results
    setProcessingProgress({
      documentA: { progress: 0, status: fileA ? 'Starting...' : 'No document' },
      documentB: { progress: 0, status: fileB ? 'Waiting...' : 'No document' },
      documentC: { progress: 0, status: fileC ? 'Waiting...' : 'No document' }
    });
    
    setPasswordA(undefined);
    setPasswordB(undefined);
    setPasswordC(undefined);

    try {
      let resultA: DocumentExtractionResult | null = null;
      let resultB: DocumentExtractionResult | null = null;
      let resultC: DocumentExtractionResult | null = null;
      
      if (fileA) {
        resultA = await processDocument(fileA, 'A', passwordA);
        setExtractedA(resultA);
      }

      if (fileB) {
        setProcessingProgress(prev => ({
          ...prev,
          documentB: { progress: 0, status: 'Starting...' }
        }));
        resultB = await processDocument(fileB, 'B', passwordB);
        setExtractedB(resultB);
      }

      if (fileC) {
        setProcessingProgress(prev => ({
          ...prev,
          documentC: { progress: 0, status: 'Starting...' }
        }));
        resultC = await processDocument(fileC, 'C', passwordC);
        setExtractedC(resultC);
      }

      // Compare first two documents if both exist
      if (resultA && resultB) {
        const comparison = compareTexts(resultA.text, resultB.text);
        setComparisonResult(comparison);
      } else {
        setComparisonResult(null);
      }
      
      // Check text search if provided
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        setTextSearchResult({
          inA: resultA ? resultA.text.toLowerCase().includes(searchLower) : false,
          inB: resultB ? resultB.text.toLowerCase().includes(searchLower) : false,
          inC: resultC ? resultC.text.toLowerCase().includes(searchLower) : false,
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
  }, [fileA, fileB, fileC, searchText, forceOCR, passwordA, passwordB, passwordC]);

  const handleBackToUpload = useCallback(() => {
    setAppState('upload');
    // Keep files and search text - don't reset them
  }, []);

  const handleFullReset = useCallback(() => {
    setAppState('upload');
    setFileA(null);
    setFileB(null);
    setFileC(null);
    setSearchText('');
    setResultsSearchText('');
    setExtractedA(null);
    setExtractedB(null);
    setExtractedC(null);
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
    setFileC(null);
    setDemoContent({ a: demoSet.documentA.content, b: demoSet.documentB.content });
    setError(null);
  }, []);
  
  const runDemoComparison = useCallback(async () => {
    if (!demoContent || !fileA || !fileB) return;
    
    setError(null);
    setAppState('processing');
    setResultsSearchText(searchText);
    setProcessingProgress({
      documentA: { progress: 0, status: 'Processing demo document...' },
      documentB: { progress: 0, status: 'Waiting...' },
      documentC: { progress: 0, status: 'No document' }
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
        inC: false,
        searchTerm: searchText.trim()
      });
    } else {
      setTextSearchResult(null);
    }
    
    setAppState('results');
  }, [demoContent, fileA, fileB, searchText]);

  // Can compare if 2+ docs, or single doc + search text
  const docCount = [fileA, fileB, fileC].filter(Boolean).length;
  const canCompare = docCount >= 2 || (docCount === 1 && searchText.trim().length > 0);

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

      <main className="container mx-auto px-4 py-8 max-w-5xl">
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
                  Upload two or three documents to compare.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FileUploadSlot
                    file={fileA}
                    onFileSelect={setFileA}
                    onFileRemove={() => setFileA(null)}
                    placeholder="First document"
                  />
                  <FileUploadSlot
                    file={fileB}
                    onFileSelect={setFileB}
                    onFileRemove={() => setFileB(null)}
                    placeholder="Second document"
                  />
                  <FileUploadSlot
                    file={fileC}
                    onFileSelect={setFileC}
                    onFileRemove={() => setFileC(null)}
                    placeholder="Third document (optional)"
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
                  placeholder="Enter text to search for in documents..."
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

            {/* View Mode & OCR Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* View Mode Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Columns className="h-4 w-4" />
                    Comparison View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ToggleGroup 
                    type="single" 
                    value={viewMode} 
                    onValueChange={(v) => v && setViewMode(v as ViewMode)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="inline" aria-label="Inline diff view">
                      <AlignJustify className="h-4 w-4 mr-2" />
                      Inline Diff
                    </ToggleGroupItem>
                    <ToggleGroupItem value="sidebyside" aria-label="Side by side view">
                      <Columns className="h-4 w-4 mr-2" />
                      Side by Side
                    </ToggleGroupItem>
                  </ToggleGroup>
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
                        Enable for scanned documents.
                      </p>
                    </div>
                    <Switch
                      checked={forceOCR}
                      onCheckedChange={setForceOCR}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

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
              {fileA && (
                <ProcessingStatus
                  progress={processingProgress.documentA.progress}
                  status={processingProgress.documentA.status}
                  documentLabel={fileA.name}
                />
              )}
              {fileB && (
                <ProcessingStatus
                  progress={processingProgress.documentB.progress}
                  status={processingProgress.documentB.status}
                  documentLabel={fileB.name}
                />
              )}
              {fileC && (
                <ProcessingStatus
                  progress={processingProgress.documentC.progress}
                  status={processingProgress.documentC.status}
                  documentLabel={fileC.name}
                />
              )}
            </CardContent>
          </Card>
        )}

        {appState === 'results' && (
          <div className="space-y-4">
            {/* Post-comparison Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search in Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Search for text/clauses in extracted documents..."
                  value={resultsSearchText}
                  onChange={(e) => handleResultsSearchChange(e.target.value)}
                  className="min-h-[60px] resize-none"
                />
              </CardContent>
            </Card>

            {/* Text Search Results */}
            {textSearchResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Searching for: <span className="font-medium text-foreground">"{textSearchResult.searchTerm}"</span>
                  </p>
                  <div className={`grid gap-4 ${extractedC ? 'grid-cols-3' : extractedA && extractedB ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {extractedA && (
                      <div className={`p-3 rounded-lg border ${textSearchResult.inA ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                        <p className="text-sm font-medium truncate">{extractedA.fileName}</p>
                        <p className={`text-xs mt-1 ${textSearchResult.inA ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                          {textSearchResult.inA ? '✓ Found' : '✗ Not found'}
                        </p>
                      </div>
                    )}
                    {extractedB && (
                      <div className={`p-3 rounded-lg border ${textSearchResult.inB ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                        <p className="text-sm font-medium truncate">{extractedB.fileName}</p>
                        <p className={`text-xs mt-1 ${textSearchResult.inB ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                          {textSearchResult.inB ? '✓ Found' : '✗ Not found'}
                        </p>
                      </div>
                    )}
                    {extractedC && (
                      <div className={`p-3 rounded-lg border ${textSearchResult.inC ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                        <p className="text-sm font-medium truncate">{extractedC.fileName}</p>
                        <p className={`text-xs mt-1 ${textSearchResult.inC ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                          {textSearchResult.inC ? '✓ Found' : '✗ Not found'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Two-document comparison results */}
            {comparisonResult && extractedA && extractedB && (
              viewMode === 'sidebyside' ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Side by Side Comparison</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {comparisonResult.isExactMatch 
                        ? 'Documents match!' 
                        : `${comparisonResult.similarity}% similarity`}
                      {activeSearchText && <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-400/60 dark:bg-yellow-500/40">Search highlighted</span>}
                    </p>
                  </CardHeader>
                <CardContent>
                    <SideBySideViewer
                      differences={comparisonResult.differences}
                      labelA={extractedA.fileName}
                      labelB={extractedB.fileName}
                      highlightText={activeSearchText}
                    />
                  </CardContent>
                </Card>
              ) : (
                <ComparisonResults
                  result={comparisonResult}
                  documentA={extractedA}
                  documentB={extractedB}
                  onReset={handleFullReset}
                  searchText={activeSearchText}
                />
              )
            )}

            {/* Third document viewer */}
            {extractedC && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {extractedC.fileName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Third document content
                    {activeSearchText && <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-400/60 dark:bg-yellow-500/40">Search highlighted</span>}
                  </p>
                </CardHeader>
                <CardContent>
                  <SingleDocViewer 
                    text={extractedC.text} 
                    highlightText={activeSearchText} 
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Single document mode - show extracted text with highlighting */}
            {singleDocMode && (extractedA || extractedB) && !extractedC && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Content
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {activeSearchText && <span className="inline-block px-2 py-0.5 rounded bg-yellow-400/60 dark:bg-yellow-500/40 mr-2">Highlighted matches</span>}
                  </p>
                </CardHeader>
                <CardContent>
                  <SingleDocViewer 
                    text={(extractedA || extractedB)!.text} 
                    highlightText={activeSearchText} 
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Back Button */}
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBackToUpload}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Button>
              {viewMode === 'sidebyside' && (
                <Button onClick={handleFullReset}>
                  Compare New Documents
                </Button>
              )}
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
