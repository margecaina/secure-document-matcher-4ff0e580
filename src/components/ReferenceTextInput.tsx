import { Textarea } from '@/components/ui/textarea';
import { Type } from 'lucide-react';

interface ReferenceTextInputProps {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

export function ReferenceTextInput({ value, onChange, disabled = false }: ReferenceTextInputProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Type className="h-4 w-4" />
        <span>Reference Text</span>
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </div>
      <Textarea
        placeholder="Paste text to compare against documents. For example, paste the original contract terms to check if documents match..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[100px] resize-none text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {wordCount > 0 ? `${wordCount} words` : 'Add text to include in comparison'}
      </p>
    </div>
  );
}
