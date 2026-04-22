const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REASON_LABEL: Record<string, string> = {
  inappropriate: "Conteúdo impróprio / Nudez",
  hate_speech: "Discurso de ódio",
  spam_scam: "Spam / Golpe",
  harassment: "Assédio",
  other: "Outros",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("MODERATION_DISCORD_WEBHOOK");
    if (!webhookUrl) {
      console.warn("MODERATION_DISCORD_WEBHOOK não configurado.");
      return new Response(JSON.stringify({ skipped: true, reason: "webhook_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const { table_id, table_title, reason, description } = payload as {
      table_id?: string;
      table_title?: string;
      reason?: string;
      description?: string | null;
    };

    if (!table_id || !reason) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableUrl = `https://cavernadosdados.lovable.app/dashboard/mesa/${table_id}/detalhes`;
    const reasonLabel = REASON_LABEL[reason] ?? reason;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      { name: "Motivo", value: reasonLabel, inline: true },
      { name: "Mesa", value: table_title || "—", inline: true },
    ];
    if (description && description.trim().length > 0) {
      fields.push({
        name: "Descrição do denunciante",
        value: description.slice(0, 1000),
      });
    }
    fields.push({
      name: "🔍 Acessar mesa",
      value: `[Abrir página da mesa](${tableUrl})`,
    });

    const body = {
      content: "🚩 **Nova denúncia recebida**",
      embeds: [
        {
          title: "Moderação — Caverna dos Dados",
          description: "Uma nova denúncia foi registrada na plataforma.",
          color: 0xB84E1F,
          fields,
          footer: { text: "Caverna dos Dados • Sistema de moderação" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      console.error("Discord webhook error:", discordRes.status, text);
      return new Response(JSON.stringify({ error: `Discord ${discordRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("moderation-discord-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});