const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { webhook_url, type, table_title, table_id } = payload;

    if (!webhook_url || typeof webhook_url !== "string" || !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
      return new Response(JSON.stringify({ error: "URL de webhook inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableUrl = `https://id-preview--3486f931-b87f-4e60-a7b2-b20cd9a29aa2.lovable.app/dashboard/mesa/${table_id}`;
    let body: Record<string, unknown>;

    if (type === "test") {
      body = {
        content: "🎲 **Caverna dos Dados**: Conexão estabelecida com sucesso!",
        embeds: [{
          title: "✅ Webhook Conectado",
          description: "Este canal está pronto para receber notificações da sua mesa de RPG.",
          color: 0xCBA35C,
        }],
      };
    } else if (type === "session_end") {
      body = {
        embeds: [{
          title: "⚔️ Aventura Finalizada!",
          description: `O mestre encerrou a sessão de **${table_title || "hoje"}**.\n\nNão esqueçam de registrar sua avaliação na plataforma para ganhar seus pontos!`,
          color: 0xCBA35C,
          footer: { text: "Caverna dos Dados • Sistema de Feedback" },
          timestamp: new Date().toISOString(),
          fields: [{
            name: "📋 Avaliar Sessão",
            value: `[Clique aqui para avaliar](${tableUrl})`,
          }],
        }],
      };
    } else if (type === "diary_entry") {
      const { session_number, session_title, summary, pinned_report } = payload;
      const fields: any[] = [];
      if (pinned_report) {
        fields.push({
          name: `📌 Relato Oficial — ${pinned_report.character_name}`,
          value: `*"${String(pinned_report.content).slice(0, 1000)}"*`,
        });
      }
      fields.push({
        name: "📖 Ver no diário",
        value: `[Abrir campanha](${tableUrl})`,
      });

      body = {
        embeds: [{
          author: { name: table_title || "Caverna dos Dados" },
          title: `📜 Sessão ${session_number}: ${session_title || "Diário"}`,
          description: String(summary || "").slice(0, 4000),
          color: 0xCBA35C,
          fields,
          footer: { text: "Caverna dos Dados • Diário da Campanha" },
          timestamp: new Date().toISOString(),
        }],
      };
    } else {
      return new Response(JSON.stringify({ error: "Tipo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discordRes = await fetch(webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      return new Response(JSON.stringify({ error: `Discord retornou ${discordRes.status}: ${text}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
