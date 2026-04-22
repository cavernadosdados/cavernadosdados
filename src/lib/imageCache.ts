/**
 * Cache persistente de imagens via Cache Storage API.
 *
 * Estratégia: stale-while-revalidate.
 * - Se a imagem está no cache: serve imediatamente (zero rede).
 * - Em paralelo, refaz o fetch para atualizar o cache caso a origem
 *   tenha mudado (capa atualizada pelo mestre).
 *
 * Vantagem sobre o cache HTTP do navegador:
 * - Sobrevive a limpezas agressivas e a "disable cache" no devtools.
 * - Funciona para URLs cross-origin (Imgur/Pinterest) sem depender
 *   dos headers que o servidor remoto define.
 * - Permite servir como Blob URL e evitar nova requisição de rede,
 *   mesmo quando os headers da resposta original não eram cacheáveis.
 *
 * Sem Service Worker: usamos a Cache API diretamente do thread principal.
 */

const CACHE_NAME = "adventure-covers-v1";
/** Capacidade máxima do cache (LRU simples). 50 capas ≈ ~10–15 MB. */
const MAX_ENTRIES = 50;

type CacheState = "unsupported" | "ready" | "failed";
let cacheState: CacheState | null = null;

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "caches" in window &&
    typeof window.fetch === "function"
  );
}

async function openCache(): Promise<Cache | null> {
  if (cacheState === "unsupported" || cacheState === "failed") return null;
  if (!isSupported()) {
    cacheState = "unsupported";
    return null;
  }
  try {
    const c = await caches.open(CACHE_NAME);
    cacheState = "ready";
    return c;
  } catch {
    cacheState = "failed";
    return null;
  }
}

/** Remove entradas antigas mantendo o cache abaixo de MAX_ENTRIES. */
async function evictIfNeeded(cache: Cache): Promise<void> {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_ENTRIES) return;
    const excess = keys.length - MAX_ENTRIES;
    // keys() retorna na ordem de inserção: as primeiras são as mais antigas.
    await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)));
  } catch {
    /* noop */
  }
}

/** Faz fetch da imagem e armazena no cache. Retorna o Response final. */
async function fetchAndStore(
  cache: Cache,
  url: string
): Promise<Response | null> {
  try {
    // `no-cors` permite cachear imagens cross-origin (resposta opaca).
    // O Blob continua utilizável como `blob:` URL para <img>.
    const res = await fetch(url, {
      mode: "no-cors",
      credentials: "omit",
      cache: "no-cache",
    });
    // Respostas opacas têm status=0 mas ainda são armazenáveis.
    await cache.put(url, res.clone());
    evictIfNeeded(cache);
    return res;
  } catch {
    return null;
  }
}

/**
 * Resolve uma URL servível para `<img src>`:
 * - Se a imagem está em cache: retorna `blob:` URL (sem ida à rede).
 * - Se não está: faz fetch, armazena, retorna `blob:` URL.
 * - Se a Cache API falhar: retorna a URL original como fallback.
 *
 * Em ambos os casos, dispara um revalidate em background quando havia hit.
 */
export async function getCachedImageUrl(url: string): Promise<string> {
  const cache = await openCache();
  if (!cache) return url;

  try {
    const hit = await cache.match(url);
    if (hit) {
      // Revalida em background sem bloquear (stale-while-revalidate).
      fetchAndStore(cache, url).catch(() => {});
      const blob = await hit.blob();
      if (blob.size > 0) return URL.createObjectURL(blob);
    }

    const fresh = await fetchAndStore(cache, url);
    if (!fresh) return url;
    const blob = await fresh.blob();
    if (blob.size > 0) return URL.createObjectURL(blob);
    return url;
  } catch {
    return url;
  }
}

/** Limpa todo o cache de capas (útil em logout/troca de conta). */
export async function clearImageCache(): Promise<void> {
  if (!isSupported()) return;
  try {
    await caches.delete(CACHE_NAME);
    cacheState = null;
  } catch {
    /* noop */
  }
}
