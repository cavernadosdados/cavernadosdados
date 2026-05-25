import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface SafeSearch {
  adult?: string;
  violence?: string;
  racy?: string;
  medical?: string;
  spoof?: string;
}

const BLOCKED = new Set(['LIKELY', 'VERY_LIKELY']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (typeof imageUrl !== 'string' || !/^https?:\/\//.test(imageUrl)) {
      return new Response(JSON.stringify({ error: 'invalid_url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'missing_api_key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const txt = await visionRes.text();
      console.error('Vision API error', visionRes.status, txt);
      return new Response(JSON.stringify({ error: 'vision_failed', detail: txt }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await visionRes.json();
    const safe: SafeSearch = data?.responses?.[0]?.safeSearchAnnotation ?? {};
    const blocked = BLOCKED.has(safe.adult ?? '') || BLOCKED.has(safe.violence ?? '');

    return new Response(
      JSON.stringify({ safe: !blocked, annotation: safe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('moderate-image error', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});