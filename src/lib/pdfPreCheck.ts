import * as pdfjsLib from 'pdfjs-dist';

// Reuse worker config from pdfExtractor
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export interface PDFPreCheckResult {
  pageCount: number;
  isScanned: boolean;
  isPasswordProtected: boolean;
  /** Estimated text chars from first 2 pages */
  sampleTextLength: number;
}

export const OCR_PAGE_HARD_LIMIT = 50;
export const TEXT_PDF_PAGE_LIMIT = 1000;

/**
 * Quick pre-check: reads first 2 pages to detect scanned vs text-based,
 * gets page count, and checks password protection.
 */
export async function preCheckPDF(file: File, password?: string): Promise<PDFPreCheckResult> {
  const arrayBuffer = await file.arrayBuffer();

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined
    }).promise;
  } catch (error: any) {
    if (error?.name === 'PasswordException') {
      return {
        pageCount: 0,
        isScanned: false,
        isPasswordProtected: true,
        sampleTextLength: 0
      };
    }
    throw error;
  }

  const pageCount = pdf.numPages;

  // Sample first 2 pages to detect if scanned
  let sampleText = '';
  const samplesToCheck = Math.min(2, pageCount);
  for (let i = 1; i <= samplesToCheck; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join('');
    sampleText += pageText;
  }

  const sampleTextLength = sampleText.trim().length;
  const isScanned = sampleTextLength < 50; // Very little text = scanned

  return {
    pageCount,
    isScanned,
    isPasswordProtected: false,
    sampleTextLength
  };
}
