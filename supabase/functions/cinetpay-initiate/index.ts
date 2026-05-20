// CinetPay payment initiation - called by authenticated client after place_order
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CINETPAY_API = "https://api-checkout.cinetpay.com/v2/payment";
const CINETPAY_CHECK = "https://api-checkout.cinetpay.com/v2/payment/check";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, return_url } = await req.json();
    if (!order_id || !return_url) {
      return new Response(JSON.stringify({ error: "order_id et return_url requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    const secretKey = Deno.env.get("CINETPAY_SECRET_KEY");
    if (!apiKey || !siteId) {
      return new Response(JSON.stringify({ error: "CinetPay non configuré" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Supabase client with user JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, reference, total_gnf, customer_name, status, user_id, created_at")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Commande introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== "pending") {
      return new Response(JSON.stringify({ error: "Commande déjà traitée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build notify_url from project URL
    const projectUrl = Deno.env.get("SUPABASE_URL")!;
    const projectRef = projectUrl.replace("https://", "").replace(".supabase.co", "");
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/cinetpay-notify`;

    const txId = `MD-${order.reference}-${Date.now()}`;
    const names = (order.customer_name || "Client").split(" ");
    const firstName = names[1] || names[0] || "Client";
    const lastName = names.slice(2).join(" ") || "Madina";

    const payload = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: txId,
      amount: Number(order.total_gnf),
      currency: "GNF",
      description: `Commande ${order.reference}`,
      notify_url: notifyUrl,
      return_url: return_url,
      channels: "ALL",
      metadata: JSON.stringify({ order_id: order.id, user_id: user.id }),
      customer_name: firstName,
      customer_surname: lastName,
      lang: "fr",
    };

    const cpRes = await fetch(CINETPAY_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const cpData = await cpRes.json();
    console.log("CinetPay init response:", JSON.stringify(cpData));

    if (!cpRes.ok || cpData.code !== "00") {
      return new Response(
        JSON.stringify({ error: cpData.message || "Échec init CinetPay" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order with CinetPay transaction id
    const { error: updErr } = await supabase
      .from("orders")
      .update({ cinetpay_transaction_id: txId })
      .eq("id", order_id);

    if (updErr) {
      console.error("Failed to update order cinetpay tx:", updErr);
    }

    return new Response(
      JSON.stringify({
        payment_url: cpData.data.payment_url,
        transaction_id: txId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cinetpay-initiate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
