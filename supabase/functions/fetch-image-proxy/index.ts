const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_REDIRECTS = 5;

function isPrivateIp(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;

  // IPv6: block loopback (::1), link-local (fe80::/10), unique-local (fc00::/7),
  // IPv4-mapped (::ffff:a.b.c.d), and anything that's clearly not a global address.
  if (h.includes(":")) {
    if (h === "::1" || h === "::" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
    const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    // Reject any other IPv6 literal to be safe — we only want public DNS hosts.
    return true;
  }

  // Reject octal/hex/decimal-encoded IPv4 (e.g. 0177.0.0.1, 0x7f000001, 2130706433)
  if (/^0x/i.test(h) || /^\d+$/.test(h)) return true;
  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^0\d+/.test(p))) return true;

  const nums = parts.map(Number);
  if (parts.length !== 4 || nums.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [a, b] = nums;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 100 && b >= 64 && b <= 127 || // CGNAT
    a >= 224 // multicast/reserved
  );
}

function validateImageUrl(rawUrl: unknown) {
  if (typeof rawUrl !== "string" || rawUrl.length > 2_000) throw new Error("URL inválida");
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use uma URL http ou https");
  if (isPrivateIp(url.hostname.toLowerCase())) throw new Error("URL não permitida");
  return url.toString();
}

// Manually follow redirects so we can re-validate the hostname after each hop.
async function safeFetch(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8",
        "User-Agent": "CavernaDosDados/1.0 image-proxy",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect inválido");
      // Resolve relative redirects against the current URL, then re-validate.
      const next = new URL(loc, currentUrl).toString();
      currentUrl = validateImageUrl(next);
      continue;
    }
    return res;
  }
  throw new Error("Muitos redirecionamentos");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url: rawUrl } = await req.json();
    const url = validateImageUrl(rawUrl);

    const response = await safeFetch(url);

    if (!response.ok) throw new Error("Não foi possível baixar a imagem");

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase() || "";
    if (!ALLOWED_TYPES.has(mimeType)) throw new Error("Formato de imagem não suportado. Use JPG, PNG, WebP, GIF ou SVG.");

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_IMAGE_BYTES) throw new Error("A imagem é muito grande. Use uma imagem de até 8MB.");

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("A imagem é muito grande. Use uma imagem de até 8MB.");

    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return new Response(JSON.stringify({ base64: btoa(binary), mimeType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});