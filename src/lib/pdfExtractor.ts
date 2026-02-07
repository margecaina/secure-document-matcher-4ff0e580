import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isScanned: boolean;
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Reconstructs structured text from PDF text items using positional data.
 * Groups items into rows by Y-coordinate and sorts by X within rows,
 * preserving table layouts and multi-column content.
 */
function extractStructuredText(items: TextItem[]): string {
  if (!items.length) return '';

  // Filter to actual text items (skip empty strings)
  const textItems = items.filter(item => item.str && item.str.trim());
  if (!textItems.length) return '';

  // Group items by approximate Y position (same row)
  const rowTolerance = 3; // pixels
  const rows: Map<number, TextItem[]> = new Map();

  for (const item of textItems) {
    const y = Math.round(item.transform[5]); // Y coordinate
    let foundRow = false;
    for (const [rowY] of rows) {
      if (Math.abs(y - rowY) <= rowTolerance) {
        rows.get(rowY)!.push(item);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rows.set(y, [item]);
    }
  }

  // Sort rows top-to-bottom (higher Y = higher on page in PDF coords)
  const sortedRows = Array.from(rows.entries())
    .sort(([a], [b]) => b - a);

  const lines: string[] = [];
  for (const [, rowItems] of sortedRows) {
    // Sort items left-to-right by X coordinate
    rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

    // Detect gaps between items for table column separation
    let line = '';
    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i];
      if (i > 0) {
        const prevItem = rowItems[i - 1];
        const prevEnd = prevItem.transform[4] + prevItem.width;
        const gap = item.transform[4] - prevEnd;
        // Large gap suggests a table column separator
        if (gap > 15) {
          line += '\t';
        } else if (gap > 2) {
          line += ' ';
        }
      }
      line += item.str;
    }
    lines.push(line);
  }

  return lines.join('\n');
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
    const pageText = extractStructuredText(textContent.items as any[]);
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
  password?: string,
  maxPages?: number
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    password: password || undefined
  }).promise;
  const images: Blob[] = [];
  const totalPages = maxPages ? Math.min(maxPages, pdf.numPages) : pdf.numPages;
  
  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(50 + (i / totalPages) * 20, `Converting page ${i}/${totalPages} to image...`);
    
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
