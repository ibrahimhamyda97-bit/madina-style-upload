// SenePay hosted checkout - initiate a payment session
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENEPAY_URL = "https://api.sene-pay.com/api/v1/checkout/sessions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, return_url } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id requis" }), {
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
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (claimsErr || !user) {
      console.error("Auth error:", claimsErr);
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, reference, total_gnf, status, customer_name, user_id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      return new Response(JSON.stringify({ error: "Commande déjà traitée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)/)?.[1];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/senepay-webhook`;

    const payload = {
      amount: Number(order.total_gnf),
      currency: "GNF",
      country: "GN",
      orderReference: order.reference,
      description: `Commande ${order.reference} - Madina SBK`,
      successUrl: `${return_url}&status=success`,
      cancelUrl: `${return_url}&status=cancel`,
      webhookUrl: notifyUrl,
      metadata: { order_id: order.id, user_id: user.id },
      expiresInMinutes: 60,
    };

    const spRes = await fetch(SENEPAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Secret": apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const spData = await spRes.json();
    console.log("SenePay init response:", spRes.status, JSON.stringify(spData));

    if (!spRes.ok || !spData.sessionToken || !spData.checkoutUrl) {
      return new Response(
        JSON.stringify({ error: spData.message || spData.error || "Erreur SenePay" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store sessionToken in the payment session column (reusing cinetpay_transaction_id)
    await supabase
      .from("orders")
      .update({ cinetpay_transaction_id: spData.sessionToken })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ payment_url: spData.checkoutUrl, session_token: spData.sessionToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("senepay-initiate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
