import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LoreType = "npc" | "location" | "faction" | "deity" | "item" | "next_hook";

const SCHEMAS: Record<LoreType, { instruction: string; example: string }> = {
  npc: {
    instruction:
      "Crie 1 NPC original e memorável para a mesa. Responda APENAS um objeto JSON com as chaves: name (string), faction (string curta, pode ser vazia), status (um de: 'alive','dead','missing'), relationship (string curta: relação com o grupo de aventureiros, ex: 'Aliado', 'Rival', 'Mentor', 'Desconhecido'), description (2-4 frases evocativas em PT-BR descrevendo aparência, personalidade e gancho de história).",
    example: `{"name":"Velina Coraçãonegro","faction":"Guilda dos Sussurros","status":"alive","relationship":"Aliada relutante","description":"Meia-elfa de olhos cor de âmbar..."}`,
  },
  location: {
    instruction:
      "Crie 1 local original e atmosférico. Responda APENAS um objeto JSON com as chaves: name (string), kind (um de: 'city','dungeon','region','landmark','other'), description (3-5 frases em PT-BR com atmosfera, geografia, perigos e ganchos).",
    example: `{"name":"Vau dos Mil Ecos","kind":"landmark","description":"Uma ponte de pedra preta..."}`,
  },
  faction: {
    instruction:
      "Crie 1 facção original. Responda APENAS um objeto JSON com as chaves: name (string), description (3-5 frases em PT-BR com objetivos, métodos, líder e segredo), reputation (inteiro entre -100 e 100, representando reputação inicial sugerida com o grupo).",
    example: `{"name":"Ordem do Crepúsculo","description":"...","reputation":-20}`,
  },
  deity: {
    instruction:
      "Crie 1 divindade original. Responda APENAS um objeto JSON com as chaves: name (string), alignment (exatamente um destes: 'Leal e Bom','Neutro e Bom','Caótico e Bom','Leal e Neutro','Neutro','Caótico e Neutro','Leal e Mau','Neutro e Mau','Caótico e Mau'), domain (string curta, ex: 'Guerra', 'Conhecimento, Magia'), description (3-5 frases em PT-BR com mitologia, símbolo, dogma e relação com mortais).",
    example: `{"name":"Veshara","alignment":"Neutro","domain":"Tempestades, Viagens","description":"..."}`,
  },
  item: {
    instruction:
      "Crie 1 item mágico/raro original. Responda APENAS um objeto JSON com as chaves: name (string), status (um de: 'unknown','found','lost','destroyed'), holder (string curta, pode ser vazia, com possível portador atual), description (3-5 frases em PT-BR com aparência, poderes/lore e maldição/preço).",
    example: `{"name":"Anel de Vau","status":"lost","holder":"","description":"..."}`,
  },
  next_hook: {
    instruction:
      "Sugira UM gancho instigante para a PRÓXIMA sessão de RPG com base no histórico do diário fornecido. Responda APENAS um objeto JSON com as chaves: title (string curta, 3-7 palavras), hook (string com 2-4 parágrafos em PT-BR, tom evocativo de fantasia, terminando com uma escolha ou cena de abertura clara para a mesa).",
    example: `{"title":"O Pacto Quebrado","hook":"..."}`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ----- AUTH: only signed-in users can spend AI quota -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const type = body.type as LoreType;
    if (!type || !SCHEMAS[type]) {
      return new Response(JSON.stringify({ error: "Tipo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schema = SCHEMAS[type];
    let userContent = "";

    if (type === "next_hook") {
      const narratives: string[] = Array.isArray(body.narratives) ? body.narratives : [];
      if (narratives.join("").trim().length < 20) {
        return new Response(
          JSON.stringify({ error: "É preciso ao menos uma sessão com relato para sugerir um gancho." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const recent = narratives.slice(-5).map((n, i) => `Sessão ${i + 1}:\n${n}`).join("\n\n---\n\n");
      userContent =
        `Mesa: ${body.table_title || "—"}\nSistema: ${body.system || "—"}\n\nHistórico recente do diário:\n\n${recent}\n\n` +
        (body.hint ? `Direção desejada pelo mestre: ${body.hint}\n\n` : "") +
        "Com base nisso, gere o gancho da PRÓXIMA sessão.";
    } else {
      userContent =
        `Mesa: ${body.table_title || "—"}\n` +
        `Sistema: ${body.system || "—"}\n` +
        `Tema: ${body.theme || "—"}\n` +
        `Descrição da mesa: ${body.table_description || "—"}\n` +
        (body.hint ? `Pedido específico do mestre: ${body.hint}\n` : "") +
        "\nGere a entrada conforme as instruções.";
    }

    const systemPrompt = `Você é um mestre de RPG criativo e evocativo, escrevendo em português do Brasil. ${schema.instruction} Não inclua comentários, markdown nem texto fora do JSON. Exemplo de formato: ${schema.example}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erro ao chamar a IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return new Response(JSON.stringify({ result: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-lore-suggestion error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});