import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export async function performOCR(
  images: Blob[],
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  let fullText = '';
  let totalConfidence = 0;
  
  for (let i = 0; i < images.length; i++) {
    onProgress?.(
      70 + (i / images.length) * 25,
      `Running OCR on page ${i + 1}/${images.length}...`
    );
    
    const result = await Tesseract.recognize(images[i], 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pageProgress = (i / images.length) + (m.progress / images.length);
          onProgress?.(
            70 + pageProgress * 25,
            `OCR: Page ${i + 1}/${images.length} (${Math.round(m.progress * 100)}%)`
          );
        }
      }
    });
    
    fullText += result.data.text + '\n';
    totalConfidence += result.data.confidence;
  }
  
  return {
    text: fullText.trim(),
    confidence: totalConfidence / images.length
  };
}

export async function performOCROnSingleImage(
  image: Blob | File,
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  onProgress?.(70, 'Initializing OCR...');
  
  const result = await Tesseract.recognize(image, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(70 + m.progress * 25, `OCR progress: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence
  };
}
