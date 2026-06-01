// SenePay verify - called by client after redirect from checkout
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_token } = await req.json();
    if (!session_token) {
      return new Response(JSON.stringify({ error: "session_token requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SENEPAY_API_KEY");
    const apiSecret = Deno.env.get("SENEPAY_API_SECRET");
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: "SenePay non configuré" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spRes = await fetch(
      `https://api.sene-pay.com/api/v1/checkout/sessions/${encodeURIComponent(session_token)}`,
      { headers: { "X-Api-Key": apiKey, "X-Api-Secret": apiSecret } }
    );

    const spData = await spRes.json();
    console.log("SenePay verify response:", spRes.status, JSON.stringify(spData));

    if (!spRes.ok) {
      return new Response(
        JSON.stringify({ error: spData.message || "Session introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = spData.status || "";
    const isPaid = status === "Complete";

    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, status, reference")
      .eq("cinetpay_transaction_id", session_token)
      .eq("user_id", user.id)
      .limit(1);

    const order = orderRows?.[0];

    if (isPaid && order && order.status === "pending") {
      await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    return new Response(
      JSON.stringify({ status, paid: isPaid, order: order || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("senepay-verify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
