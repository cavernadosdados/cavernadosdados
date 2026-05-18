const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function isPrivateIp(hostname: string) {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0;
}

function validateImageUrl(rawUrl: unknown) {
  if (typeof rawUrl !== "string" || rawUrl.length > 2_000) throw new Error("URL inválida");
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use uma URL http ou https");
  if (isPrivateIp(url.hostname.toLowerCase())) throw new Error("URL não permitida");
  return url.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url: rawUrl } = await req.json();
    const url = validateImageUrl(rawUrl);

    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8",
        "User-Agent": "CavernaDosDados/1.0 image-proxy",
      },
      redirect: "follow",
    });

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