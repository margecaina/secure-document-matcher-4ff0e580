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
  const startTime = Date.now();
  const CHUNK_SIZE = 25;
  
  for (let i = 0; i < images.length; i++) {
    // ETA calculation
    const elapsed = (Date.now() - startTime) / 1000;
    const pagesPerSec = i > 0 ? i / elapsed : 0;
    const remaining = pagesPerSec > 0 ? Math.round((images.length - i) / pagesPerSec) : 0;
    const etaStr = i > 0 ? ` (~${formatETA(remaining)} remaining)` : '';
    
    onProgress?.(
      70 + (i / images.length) * 25,
      `OCR: Page ${i + 1}/${images.length}${etaStr}`
    );
    
    const result = await Tesseract.recognize(images[i], 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pageProgress = (i / images.length) + (m.progress / images.length);
          onProgress?.(
            70 + pageProgress * 25,
            `OCR: Page ${i + 1}/${images.length} (${Math.round(m.progress * 100)}%)${etaStr}`
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
    
    // Yield to UI every chunk
    if ((i + 1) % CHUNK_SIZE === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
  
  return {
    text: fullText.trim(),
    confidence: validPages > 0 ? totalConfidence / validPages : 0
  };
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
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
