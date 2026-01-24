import mammoth from 'mammoth';

export interface WordExtractionResult {
  text: string;
  html: string;
}

export async function extractTextFromWord(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<WordExtractionResult> {
  onProgress?.(10, 'Reading Word document...');
  
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(30, 'Extracting text...');
  
  const result = await mammoth.extractRawText({ arrayBuffer });
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  
  onProgress?.(100, 'Complete');
  
  return {
    text: result.value.trim(),
    html: htmlResult.value
  };
}
