import { extractTextFromPDF, getPDFPagesAsImages, PasswordRequiredError, IncorrectPasswordError } from './pdfExtractor';
import { extractTextFromWord } from './wordExtractor';
import { performOCR } from './ocrProcessor';

export interface DocumentExtractionResult {
  text: string;
  fileName: string;
  fileType: 'pdf' | 'word';
  usedOCR: boolean;
  ocrConfidence?: number;
}

export { PasswordRequiredError, IncorrectPasswordError };

export async function extractTextFromDocument(
  file: File,
  forceOCR: boolean = false,
  onProgress?: (progress: number, status: string) => void,
  password?: string
): Promise<DocumentExtractionResult> {
  const fileName = file.name.toLowerCase();
  const isPDF = fileName.endsWith('.pdf');
  const isWord = fileName.endsWith('.docx') || fileName.endsWith('.doc');
  
  if (!isPDF && !isWord) {
    throw new Error('Unsupported file type. Please upload a PDF or Word document.');
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
    onProgress?.(50, 'PDF appears to be scanned. Starting OCR...');
    
    const images = await getPDFPagesAsImages(file, onProgress, password);
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
