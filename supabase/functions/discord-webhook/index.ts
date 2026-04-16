import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { webhook_url, type, table_title, table_id } = await req.json();

    if (!webhook_url || typeof webhook_url !== "string" || !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
      return new Response(JSON.stringify({ error: "URL de webhook inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown>;

    if (type === "test") {
      body = {
        content: "🎲 **Caverna dos Dados**: Conexão estabelecida com sucesso!",
        embeds: [{
          title: "✅ Webhook Conectado",
          description: "Este canal está pronto para receber notificações da sua mesa de RPG.",
          color: 0xCBA35C, // Gold
        }],
      };
    } else if (type === "session_end") {
      const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "");
      const tableUrl = `https://id-preview--3486f931-b87f-4e60-a7b2-b20cd9a29aa2.lovable.app/dashboard/mesa/${table_id}`;

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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
