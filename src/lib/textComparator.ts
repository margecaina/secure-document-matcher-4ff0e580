import { diffWords, Change } from 'diff';

export interface ComparisonResult {
  isExactMatch: boolean;
  similarity: number;
  differences: Change[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  documentAText: string;
  documentBText: string;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compareTexts(textA: string, textB: string): ComparisonResult {
  const normalizedA = normalizeText(textA);
  const normalizedB = normalizeText(textB);
  
  const isExactMatch = normalizedA === normalizedB;
  
  const differences = diffWords(normalizedA, normalizedB);
  
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;
  
  differences.forEach((part) => {
    const wordCount = part.value.split(/\s+/).filter(w => w.length > 0).length;
    if (part.added) {
      addedCount += wordCount;
    } else if (part.removed) {
      removedCount += wordCount;
    } else {
      unchangedCount += wordCount;
    }
  });
  
  const totalWords = addedCount + removedCount + unchangedCount;
  const similarity = totalWords > 0 
    ? Math.round((unchangedCount / (unchangedCount + Math.max(addedCount, removedCount))) * 100)
    : 100;
  
  return {
    isExactMatch,
    similarity,
    differences,
    addedCount,
    removedCount,
    unchangedCount,
    documentAText: normalizedA,
    documentBText: normalizedB
  };
}
