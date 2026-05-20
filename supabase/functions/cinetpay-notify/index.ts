// CinetPay webhook notification - called by CinetPay servers
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
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    if (!apiKey || !siteId) {
      return new Response(JSON.stringify({ error: "CinetPay non configuré" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CinetPay sends data as JSON or form data depending on version
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const text = await req.text();
      try { body = JSON.parse(text); } catch { body = Object.fromEntries(new URLSearchParams(text)); }
    }

    const transactionId = body?.transaction_id ?? body?.cpm_trans_id ?? body?.transactionId ?? "";
    const statusFromCinetPay = body?.status ?? body?.cpm_result ?? "";

    console.log("CinetPay notify received:", JSON.stringify(body));

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transaction_id manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with CinetPay API directly (do not trust the notification blindly)
    const verifyRes = await fetch(CINETPAY_CHECK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
    });

    const verifyData = await verifyRes.json();
    console.log("CinetPay verify response:", JSON.stringify(verifyData));

    if (!verifyRes.ok || verifyData.code !== "00") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentStatus = verifyData.data?.status || statusFromCinetPay;
    const isSuccess = paymentStatus === "ACCEPTED" || paymentStatus === "00" || String(paymentStatus).toLowerCase().includes("accept");

    if (!isSuccess) {
      return new Response(JSON.stringify({ received: true, status: paymentStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to update order (webhook has no user auth)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: orderRows } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("cinetpay_transaction_id", transactionId)
      .limit(1);

    const order = orderRows?.[0];
    if (!order) {
      console.error("Order not found for tx:", transactionId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status === "paid") {
      return new Response(JSON.stringify({ received: true, already_paid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updErr) {
      console.error("Failed to update order:", updErr);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Order marked as paid:", order.id, "tx:", transactionId);

    return new Response(JSON.stringify({ received: true, paid: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cinetpay-notify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
