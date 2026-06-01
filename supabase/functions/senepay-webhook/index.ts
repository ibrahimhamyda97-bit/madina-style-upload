// SenePay webhook - signed HMAC-SHA256 notification
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-senepay-signature, x-senepay-event",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-senepay-signature") || "";
    const webhookSecret = Deno.env.get("SENEPAY_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("SENEPAY_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", { status: 500 });
    }

    const expected = await hmacSha256Hex(webhookSecret, rawBody);
    if (signature.toLowerCase() !== expected.toLowerCase()) {
      console.error("Invalid signature", { received: signature, expected });
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log("SenePay webhook:", payload.event, payload.sessionToken, payload.status);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sessionToken: string | undefined = payload.sessionToken;
    const orderReference: string | undefined = payload.orderReference;
    if (!sessionToken && !orderReference) {
      return new Response("ok", { status: 200 });
    }

    let query = supabase.from("orders").select("id, status, reference").limit(1);
    if (sessionToken) query = query.eq("cinetpay_transaction_id", sessionToken);
    else query = query.eq("reference", orderReference!);

    const { data: rows } = await query;
    const order = rows?.[0];
    if (!order) {
      console.warn("Order not found for webhook");
      return new Response("ok", { status: 200 });
    }

    if (payload.event === "checkout.session.completed" && order.status === "pending") {
      await supabase.from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", order.id);
    } else if (payload.event === "checkout.session.failed" && order.status === "pending") {
      await supabase.from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("senepay-webhook error:", e);
    return new Response("error", { status: 500 });
  }
});
