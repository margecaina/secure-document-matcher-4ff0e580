import { extractTextFromPDF, getPDFPagesAsImages, PasswordRequiredError, IncorrectPasswordError } from './pdfExtractor';
import { extractTextFromWord } from './wordExtractor';
import { performOCR, performOCROnSingleImage } from './ocrProcessor';
import { preCheckPDF, OCR_PAGE_HARD_LIMIT, TEXT_PDF_PAGE_LIMIT } from './pdfPreCheck';

export interface DocumentExtractionResult {
  text: string;
  fileName: string;
  fileType: 'pdf' | 'word' | 'image';
  usedOCR: boolean;
  ocrConfidence?: number;
}

export interface DocumentPreCheckResult {
  isScanned: boolean;
  pageCount: number;
  exceedsOCRLimit: boolean;
  exceedsTextLimit: boolean;
}

export { PasswordRequiredError, IncorrectPasswordError };

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'];

/**
 * Pre-check a PDF to detect if it's scanned and get page count.
 * Returns null for non-PDF files.
 */
export async function preCheckDocument(file: File, password?: string): Promise<DocumentPreCheckResult | null> {
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.pdf')) return null;

  const result = await preCheckPDF(file, password);
  
  if (result.isPasswordProtected) return null; // Will be handled by password flow

  return {
    isScanned: result.isScanned,
    pageCount: result.pageCount,
    exceedsOCRLimit: result.pageCount > OCR_PAGE_HARD_LIMIT,
    exceedsTextLimit: result.pageCount > TEXT_PDF_PAGE_LIMIT,
  };
}

export async function extractTextFromDocument(
  file: File,
  forceOCR: boolean = false,
  onProgress?: (progress: number, status: string) => void,
  password?: string
): Promise<DocumentExtractionResult> {
  const fileName = file.name.toLowerCase();
  const isPDF = fileName.endsWith('.pdf');
  const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc');
  const isImage = IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext)) || file.type.startsWith('image/');
  
  if (!isPDF && !isWord && !isImage) {
    throw new Error('Unsupported file type. Please upload a PDF, Word document, or image.');
  }
  
  if (isImage) {
    onProgress?.(0, 'Processing image with OCR...');
    const ocrResult = await performOCROnSingleImage(file, onProgress);
    onProgress?.(100, 'OCR complete');
    return {
      text: ocrResult.text,
      fileName: file.name,
      fileType: 'image',
      usedOCR: true,
      ocrConfidence: ocrResult.confidence
    };
  }
  
  if (isWord) {
    onProgress?.(0, 'Processing Word document...');
    const result = await extractTextFromWord(file, onProgress);
    return {
      text: result.text,
      fileName: file.name,
      fileType: 'word',
      usedOCR: false
    };
  }
  
  // PDF processing
  onProgress?.(0, 'Processing PDF...');
  const pdfResult = await extractTextFromPDF(file, onProgress, password);
  
  // Check if OCR is needed
  if (forceOCR || pdfResult.isScanned) {
    const maxPages = Math.min(pdfResult.pageCount, OCR_PAGE_HARD_LIMIT);
    onProgress?.(50, `PDF appears scanned. Starting OCR on ${maxPages} pages...`);
    
    const images = await getPDFPagesAsImages(file, onProgress, password, maxPages);
    const ocrResult = await performOCR(images, onProgress);
    
    onProgress?.(100, 'OCR complete');
    
    return {
      text: ocrResult.text,
      fileName: file.name,
      fileType: 'pdf',
      usedOCR: true,
      ocrConfidence: ocrResult.confidence
    };
  }
  
  onProgress?.(100, 'Extraction complete');
  
  return {
    text: pdfResult.text,
    fileName: file.name,
    fileType: 'pdf',
    usedOCR: false
  };
}
