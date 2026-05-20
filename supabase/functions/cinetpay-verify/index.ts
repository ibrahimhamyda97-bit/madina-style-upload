// CinetPay payment verification - called by client after redirect from CinetPay
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CINETPAY_CHECK = "https://api-checkout.cinetpay.com/v2/payment/check";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "transaction_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
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

    // Check with CinetPay API
    const cpRes = await fetch(CINETPAY_CHECK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id }),
    });

    const cpData = await cpRes.json();
    console.log("CinetPay verify response:", JSON.stringify(cpData));

    if (!cpRes.ok || cpData.code !== "00") {
      return new Response(
        JSON.stringify({ error: cpData.message || "Transaction introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentStatus = cpData.data?.status || "";
    const isSuccess = paymentStatus === "ACCEPTED" || String(paymentStatus).toLowerCase().includes("accept");

    // Also check our DB for the order
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, status, reference")
      .eq("cinetpay_transaction_id", transaction_id)
      .eq("user_id", user.id)
      .limit(1);

    const order = orderRows?.[0];

    // If CinetPay says success but our DB still pending, update it
    if (isSuccess && order && order.status === "pending") {
      const { error: updErr } = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);

      if (updErr) console.error("Failed to update order on verify:", updErr);
    }

    return new Response(
      JSON.stringify({
        status: paymentStatus,
        paid: isSuccess,
        order: order || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("cinetpay-verify error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
