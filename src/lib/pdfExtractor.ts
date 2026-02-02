import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isScanned: boolean;
}

export class PasswordRequiredError extends Error {
  constructor() {
    super('PDF is password protected');
    this.name = 'PasswordRequiredError';
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super('Incorrect password');
    this.name = 'IncorrectPasswordError';
  }
}

export async function checkPDFPassword(file: File): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    await loadingTask.promise;
    return false; // Not password protected
  } catch (error: any) {
    if (error?.name === 'PasswordException') {
      return true; // Password protected
    }
    throw error;
  }
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number, status: string) => void,
  password?: string
): Promise<PDFExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(5, 'Loading PDF...');
  
  let pdf;
  try {
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      password: password || undefined
    });
    pdf = await loadingTask.promise;
  } catch (error: any) {
    if (error?.name === 'PasswordException') {
      if (error.code === 1) {
        // Need a password
        throw new PasswordRequiredError();
      } else if (error.code === 2) {
        // Incorrect password
        throw new IncorrectPasswordError();
      }
    }
    throw error;
  }
  
  let fullText = '';
  const pageCount = pdf.numPages;
  
  onProgress?.(10, 'Extracting text...');
  
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
    
    onProgress?.(10 + (i / pageCount) * 40, `Extracting page ${i}/${pageCount}...`);
  }
  
  // Check if PDF appears to be scanned (very little text extracted)
  const isScanned = fullText.trim().length < 100 && pageCount > 0;
  
  return {
    text: fullText.trim(),
    pageCount,
    isScanned
  };
}

export async function getPDFPageAsImage(file: File, pageNumber: number = 1, password?: string): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    password: password || undefined
  }).promise;
  const page = await pdf.getPage(pageNumber);
  
  const scale = 2; // Higher scale for better OCR
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export async function getPDFPagesAsImages(
  file: File,
  onProgress?: (progress: number, status: string) => void,
  password?: string
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    password: password || undefined
  }).promise;
  const images: Blob[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(50 + (i / pdf.numPages) * 20, `Converting page ${i}/${pdf.numPages} to image...`);
    
    const page = await pdf.getPage(i);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
    
    images.push(blob);
  }
  
  return images;
}
