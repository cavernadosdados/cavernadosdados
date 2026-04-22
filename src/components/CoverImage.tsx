import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cache em memória de URLs já carregadas com sucesso na sessão.
 * Evita re-fetch e re-flash de placeholder em re-renderizações
 * (filtros, ordenação, navegação client-side).
 */
const loadedCache = new Set<string>();

interface CoverImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /**
   * Define `fetchpriority="high"` e desativa o IntersectionObserver
   * para imagens above-the-fold (ex: primeiros 2 cards).
   */
  eager?: boolean;
  /** Conteúdo de fallback quando não há src. */
  fallback?: React.ReactNode;
}

/**
 * Capa de mesa otimizada:
 * - Lazy-load via IntersectionObserver (rootMargin 200px) para evitar
 *   baixar imagens fora da viewport.
 * - Cache em memória + `loading="lazy"` nativo como fallback.
 * - `decoding="async"` para não bloquear o thread principal.
 * - Fade-in suave ao carregar (skip se já estava em cache).
 *
 * Imagens da galeria curada vivem em /public/assets/adventure-covers/
 * (servidas pelo Vite com cache HTTP de longo prazo em produção).
 */
export function CoverImage({
  src,
  alt,
  className,
  eager = false,
  fallback,
}: CoverImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wasCached = !!src && loadedCache.has(src);
  const [shouldLoad, setShouldLoad] = useState(eager || wasCached);
  const [loaded, setLoaded] = useState(wasCached);
  const [errored, setErrored] = useState(false);

  // IntersectionObserver: dispara o download quando o card se aproxima da viewport
  useEffect(() => {
    if (shouldLoad || !containerRef.current) return;
    const el = containerRef.current;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  if (!src || errored) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-muted to-card",
          className
        )}
      >
        {fallback ?? <ImageIcon className="h-16 w-16 text-muted-foreground/30" />}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // fetchpriority é prop não tipada nativamente em React 18
          {...({ fetchpriority: eager ? "high" : "low" } as any)}
          onLoad={() => {
            loadedCache.add(src);
            setLoaded(true);
          }}
          onError={() => setErrored(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}
