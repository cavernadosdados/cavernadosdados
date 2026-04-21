import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ImageOff, Image as ImageIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverImageInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const isValidUrl = (str: string) => {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

export function CoverImageInput({ value, onChange, className }: CoverImageInputProps) {
  const [debounced, setDebounced] = useState(value);
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    setErrored(false);
    setLoading(isValidUrl(debounced));
  }, [debounced]);

  const showPreview = isValidUrl(debounced);

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        type="url"
        inputMode="url"
        placeholder="https://i.imgur.com/exemplo.jpg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/30">
        {showPreview && !errored ? (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40 animate-pulse">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <img
              src={debounced}
              alt="Preview da capa da mesa"
              className="h-full w-full object-cover"
              onLoad={() => setLoading(false)}
              onError={() => {
                setErrored(true);
                setLoading(false);
              }}
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            {errored ? (
              <>
                <ImageOff className="h-7 w-7 text-destructive/70" />
                <span className="text-xs">Não foi possível carregar a imagem</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-7 w-7 opacity-60" />
                <span className="text-xs">Cole um link para ver o preview</span>
              </>
            )}
          </div>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
        Recomendamos links do <strong className="text-foreground/80">Imgur</strong> ou{' '}
        <strong className="text-foreground/80">Pinterest</strong> para melhor performance.
      </p>
    </div>
  );
}