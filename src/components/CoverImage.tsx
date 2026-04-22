import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCachedImageUrl } from "@/lib/imageCache";

/**
 * Cache em memória (L1) de URLs já resolvidas na sessão.
 * Mapeia URL original → URL servível (geralmente um `blob:` vindo
 * da Cache Storage). Evita re-fetch e re-flash em re-renderizações.
 */
const memoryCache = new Map<string, string>();

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
 * Capa de mesa com cache em duas camadas:
 *
 * L1 — Memória (síncrono): evita re-trabalho dentro da mesma sessão.
 * L2 — Cache Storage API (persistente): sobrevive entre visitas e abas,
 *      com estratégia stale-while-revalidate (ver `lib/imageCache`).
 *
 * Plus:
 * - Lazy-load via IntersectionObserver (rootMargin 200px).
 * - `decoding="async"` + `fetchpriority` apropriado.
 * - Fade-in suave ao carregar (skip se já estava em cache).
 */
export function CoverImage({
  src,
  alt,
  className,
  eager = false,
  fallback,
}: CoverImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cachedUrl = src ? memoryCache.get(src) : undefined;

  const [shouldLoad, setShouldLoad] = useState(eager || !!cachedUrl);
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(cachedUrl);
  const [loaded, setLoaded] = useState(!!cachedUrl);
  const [errored, setErrored] = useState(false);

  // IntersectionObserver: dispara o trabalho quando o card se aproxima da viewport
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

  // Resolve via cache persistente assim que decidimos carregar
  useEffect(() => {
    if (!src || !shouldLoad || resolvedSrc) return;

    let cancelled = false;
    getCachedImageUrl(src)
      .then((url) => {
        if (cancelled) return;
        memoryCache.set(src, url);
        setResolvedSrc(url);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: usar a URL original direto
        memoryCache.set(src, src);
        setResolvedSrc(src);
      });

    return () => {
      cancelled = true;
    };
  }, [src, shouldLoad, resolvedSrc]);

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
      {shouldLoad && resolvedSrc && (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // fetchpriority é prop não tipada nativamente em React 18
          {...({ fetchpriority: eager ? "high" : "low" } as any)}
          onLoad={() => setLoaded(true)}
          onError={() => {
            // Se o blob falhou, tenta direto a URL original como último recurso
            if (src && resolvedSrc !== src) {
              memoryCache.set(src, src);
              setResolvedSrc(src);
            } else {
              setErrored(true);
            }
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}
