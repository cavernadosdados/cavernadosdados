import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ImageOff, Image as ImageIcon, Info, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export type ModerationStatus = 'idle' | 'checking' | 'safe' | 'blocked' | 'error';

interface CoverImageInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onModerationChange?: (status: ModerationStatus) => void;
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

export function CoverImageInput({ value, onChange, className, onModerationChange }: CoverImageInputProps) {
  const [debounced, setDebounced] = useState(value);
  const [errored, setErrored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moderation, setModeration] = useState<ModerationStatus>('idle');
  const [moderationMsg, setModerationMsg] = useState<string | null>(null);
  const lastCheckedRef = useRef<string>('');

  const notify = (s: ModerationStatus) => {
    setModeration(s);
    onModerationChange?.(s);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    setErrored(false);
    setLoading(isValidUrl(debounced));
  }, [debounced]);

  // Reset moderation when URL changes
  useEffect(() => {
    if (!isValidUrl(value)) {
      lastCheckedRef.current = '';
      setModerationMsg(null);
      notify('idle');
    } else if (value.trim() !== lastCheckedRef.current) {
      setModerationMsg(null);
      notify('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const runModeration = async () => {
    const url = value.trim();
    if (!isValidUrl(url) || url === lastCheckedRef.current) return;
    lastCheckedRef.current = url;
    notify('checking');
    setModerationMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-image', {
        body: { imageUrl: url },
      });
      if (error) throw error;
      if (data?.safe) {
        notify('safe');
      } else {
        notify('blocked');
        setModerationMsg(
          'A imagem selecionada não cumpre nossas diretrizes de segurança (Conteúdo impróprio detectado)'
        );
      }
    } catch (e) {
      console.error('Moderação falhou', e);
      notify('error');
      setModerationMsg('Não foi possível validar a imagem agora. Tente novamente.');
      lastCheckedRef.current = '';
    }
  };

  const showPreview = isValidUrl(debounced);

  return (
    <div className={cn('space-y-2', className)}>
      <Input
        type="url"
        inputMode="url"
        placeholder="https://i.imgur.com/exemplo.jpg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={runModeration}
      />

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/30">
        {showPreview && !errored ? (
          <>
            {(loading || moderation === 'checking') && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40 animate-pulse">
                {moderation === 'checking' ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
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
            {moderation === 'blocked' && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 backdrop-blur-sm">
                <ShieldAlert className="h-8 w-8 text-destructive-foreground" />
              </div>
            )}
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

      {moderation === 'blocked' && moderationMsg && (
        <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {moderationMsg}
        </p>
      )}
      {moderation === 'error' && moderationMsg && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {moderationMsg}
        </p>
      )}
      {moderation === 'safe' && (
        <p className="flex items-start gap-1.5 text-xs text-emerald-500">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Imagem aprovada pela moderação automática.
        </p>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/70" />
        Recomendamos links do <strong className="text-foreground/80">Imgur</strong> ou{' '}
        <strong className="text-foreground/80">Pinterest</strong> para melhor performance.
      </p>
    </div>
  );
}