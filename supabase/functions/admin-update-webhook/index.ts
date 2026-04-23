import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Extrai project ref da URL: https://<ref>.supabase.co
function getProjectRef(): string {
  const url = new URL(SUPABASE_URL);
  return url.hostname.split(".")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Autentica usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é admin via service role
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const current = Deno.env.get("MODERATION_DISCORD_WEBHOOK") ?? "";
      // Mascarar valor por segurança
      const masked = current
        ? current.slice(0, 35) + "•••••" + current.slice(-6)
        : "";
      return new Response(
        JSON.stringify({ configured: !!current, masked }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { webhook_url, test_only } = body as { webhook_url?: string; test_only?: boolean };

      if (!webhook_url || typeof webhook_url !== "string") {
        return new Response(JSON.stringify({ error: "missing_url" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Valida formato de webhook do Discord
      const isDiscord = /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i.test(
        webhook_url.trim(),
      );
      if (!isDiscord) {
        return new Response(
          JSON.stringify({ error: "invalid_webhook_format", message: "URL não parece ser um webhook do Discord válido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Testa conexão
      const testRes = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: test_only
            ? "✅ **Teste de webhook** — Caverna dos Dados (sem alteração)"
            : "🔧 **Webhook atualizado** — novo destino de notificações de moderação está ativo.",
        }),
      });

      if (!testRes.ok) {
        const text = await testRes.text();
        return new Response(
          JSON.stringify({
            error: "webhook_test_failed",
            status: testRes.status,
            details: text.slice(0, 300),
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (test_only) {
        return new Response(JSON.stringify({ success: true, tested: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atualiza secret via Management API
      const managementToken = Deno.env.get("SUPABASE_MANAGEMENT_TOKEN");
      if (!managementToken) {
        return new Response(
          JSON.stringify({
            error: "management_token_missing",
            message: "Configure o secret SUPABASE_MANAGEMENT_TOKEN para permitir atualização automática.",
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const ref = getProjectRef();
      const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${managementToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          { name: "MODERATION_DISCORD_WEBHOOK", value: webhook_url.trim() },
        ]),
      });

      if (!mgmtRes.ok) {
        const text = await mgmtRes.text();
        console.error("Management API error:", mgmtRes.status, text);
        return new Response(
          JSON.stringify({ error: "management_update_failed", details: text.slice(0, 300) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, updated: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-update-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});