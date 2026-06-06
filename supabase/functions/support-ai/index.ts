// Madina SBK - Support AI
// Conversational assistant that can look up the authenticated user's
// orders, delivery status, refunds and answer customer-service questions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM_PROMPT = `Tu es Sama, l'assistante virtuelle officielle de Madina SBK,
la marketplace guinéenne. Tu réponds toujours en français, de manière claire,
chaleureuse et humaine, avec des phrases courtes et bien structurées.

Tu peux aider sur :
- l'état d'une commande (paiement, préparation, livraison)
- le statut du livreur et le code de livraison
- les remboursements et annulations (politique : remboursement sous 7 jours
  ouvrés après validation par l'équipe Madina SBK pour toute commande non
  livrée ou produit non conforme)
- le suivi des paiements Orange Money / MTN Mobile Money
- les boutiques, produits, et procédure de commande
- aider un client à retrouver une commande à partir du numéro SAM-XXXDJXXX

Règles importantes :
- N'invente JAMAIS des informations sur une commande. Utilise UNIQUEMENT le
  contexte « DONNÉES CLIENT » fourni ci-dessous.
- Si le client n'est pas connecté, invite-le poliment à se connecter pour
  consulter ses commandes.
- Si une commande demandée n'existe pas dans le contexte, dis-le clairement
  et propose de vérifier le numéro (format SAM-XXXDJXXX) ou de contacter
  le support humain.
- Sois concise mais empathique. Termine par une question utile si pertinent.`;

const statusLabel: Record<string, string> = {
  pending: "En attente de paiement",
  paid: "Payée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};
const deliveryLabel: Record<string, string> = {
  unassigned: "En attente d'un livreur",
  assigned: "Livreur assigné, en route vers la boutique",
  picked_up: "Colis récupéré chez le vendeur",
  in_transit: "En cours de livraison",
  delivered: "Livrée",
  failed: "Échec de livraison",
};

function formatOrder(o: any) {
  return `• ${o.reference} — ${statusLabel[o.status] ?? o.status} · Livraison: ${
    deliveryLabel[o.delivery_status] ?? o.delivery_status
  } · Total: ${Number(o.total_gnf).toLocaleString("fr-FR")} GNF · Créée le ${new Date(
    o.created_at,
  ).toLocaleDateString("fr-FR")}${o.payment_operator ? ` · ${o.payment_operator}` : ""}${
    o.delivery_code && o.status === "paid" && o.delivery_status !== "delivered"
      ? ` · Code de livraison: ${o.delivery_code}`
      : ""
  }`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, reference } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify the user (optional)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user ?? null;

    let context = "DONNÉES CLIENT :\n";
    if (!user) {
      context += "Client non connecté. Aucune commande accessible.\n";
    } else {
      context += `Client connecté: ${user.email ?? user.id}\n`;
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Recent orders for this user
      const { data: orders } = await admin
        .from("orders")
        .select(
          "reference,status,delivery_status,total_gnf,payment_operator,delivery_code,pickup_code,created_at,paid_at,delivered_at,courier_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (orders && orders.length) {
        context += `Dernières commandes (${orders.length}):\n` + orders.map(formatOrder).join("\n") + "\n";
      } else {
        context += "Aucune commande dans l'historique.\n";
      }

      // Specific lookup if a reference was extracted client-side
      if (reference && typeof reference === "string") {
        const ref = reference.toUpperCase().trim();
        const { data: one } = await admin
          .from("orders")
          .select(
            "reference,status,delivery_status,total_gnf,payment_operator,delivery_code,pickup_code,created_at,paid_at,delivered_at,customer_address,user_id",
          )
          .eq("reference", ref)
          .maybeSingle();
        if (one && one.user_id === user.id) {
          context += `\nCommande demandée ${ref}:\n${formatOrder(one)}`;
          if (one.customer_address) context += `\n  Adresse: ${one.customer_address}`;
        } else if (one) {
          context += `\nLa commande ${ref} existe mais n'appartient pas à ce client.`;
        } else {
          context += `\nAucune commande trouvée avec le numéro ${ref}.`;
        }
      }
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: context },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      const status = aiResponse.status === 429 || aiResponse.status === 402 ? aiResponse.status : 500;
      return new Response(
        JSON.stringify({
          error:
            aiResponse.status === 429
              ? "Trop de requêtes, réessayez dans un instant."
              : aiResponse.status === 402
              ? "Crédits IA épuisés. Contactez l'administrateur."
              : "Erreur IA: " + errText,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("support-ai error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
