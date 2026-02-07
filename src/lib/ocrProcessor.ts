import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

// Filter out OCR blocks that are likely logos, signatures, or decorative elements
function filterOCRText(data: Tesseract.Page): string {
  const lines = data.lines || [];
  const filteredLines: string[] = [];

  for (const line of lines) {
    // Skip lines with very low confidence (likely logos/signatures/graphics)
    if (line.confidence < 40) continue;

    // Skip lines that are mostly non-alphanumeric (decorative elements)
    const text = line.text.trim();
    if (!text) continue;
    const alphanumCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
    if (text.length > 3 && alphanumCount / text.length < 0.3) continue;

    // Skip very short isolated fragments (likely OCR noise from logos)
    if (text.length <= 2 && line.confidence < 70) continue;

    filteredLines.push(text);
  }

  return filteredLines.join('\n');
}

export async function performOCR(
  images: Blob[],
  onProgress?: (progress: number, status: string) => void
): Promise<OCRResult> {
  let fullText = '';
  let totalConfidence = 0;
  let validPages = 0;
  
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
    
    const filtered = filterOCRText(result.data);
    if (filtered) {
      fullText += filtered + '\n';
      totalConfidence += result.data.confidence;
      validPages++;
    }
  }
  
  return {
    text: fullText.trim(),
    confidence: validPages > 0 ? totalConfidence / validPages : 0
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
  
  const filtered = filterOCRText(result.data);
  
  return {
    text: filtered,
    confidence: result.data.confidence
  };
}
