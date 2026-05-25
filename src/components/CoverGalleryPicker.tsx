import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoverImageInput, type ModerationStatus } from '@/components/CoverImageInput';
import { ADVENTURE_COVERS } from '@/data/adventure-covers';
import { cn } from '@/lib/utils';
import { Check, Image as ImageIcon, Link2 } from 'lucide-react';

interface CoverGalleryPickerProps {
  value: string;
  onChange: (value: string) => void;
  onModerationChange?: (status: ModerationStatus) => void;
}

/**
 * Permite ao mestre escolher uma capa da galeria curada (sem custo de upload)
 * ou colar uma URL externa (Imgur/Pinterest). Salva apenas a string em cover_url.
 */
export function CoverGalleryPicker({ value, onChange, onModerationChange }: CoverGalleryPickerProps) {
  const isFromGallery = ADVENTURE_COVERS.some((c) => c.url === value);
  const [tab, setTab] = useState<'gallery' | 'url'>(
    value && !isFromGallery ? 'url' : 'gallery'
  );

  // Galeria curada é sempre segura — limpa o status quando muda para a galeria.
  useEffect(() => {
    if (tab === 'gallery') onModerationChange?.('idle');
  }, [tab, onModerationChange]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'gallery' | 'url')} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="gallery" className="gap-1.5">
          <ImageIcon className="h-4 w-4" /> Galeria
        </TabsTrigger>
        <TabsTrigger value="url" className="gap-1.5">
          <Link2 className="h-4 w-4" /> URL externa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gallery" className="mt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ADVENTURE_COVERS.map((cover) => {
            const selected = value === cover.url;
            return (
              <button
                key={cover.id}
                type="button"
                onClick={() => onChange(cover.url)}
                className={cn(
                  'group relative aspect-video overflow-hidden rounded-md border-2 transition-all',
                  selected
                    ? 'border-primary shadow-[0_0_12px_-2px_hsl(var(--primary))]'
                    : 'border-border hover:border-primary/50'
                )}
                aria-label={`Selecionar capa ${cover.label}`}
              >
                {/* 800x450px (16:9) — otimizado para cards/banners */}
                <img
                  src={cover.url}
                  alt={cover.label}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                  <span className="text-[10px] font-medium text-white">{cover.label}</span>
                </div>
                {selected && (
                  <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Capas curadas pela plataforma. Tamanho ideal: <strong className="text-foreground/80">800x450px</strong>.
        </p>
      </TabsContent>

      <TabsContent value="url" className="mt-3">
        <CoverImageInput
          value={isFromGallery ? '' : value}
          onChange={onChange}
          onModerationChange={onModerationChange}
        />
      </TabsContent>
    </Tabs>
  );
}