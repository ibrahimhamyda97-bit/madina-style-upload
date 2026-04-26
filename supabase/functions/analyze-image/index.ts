// Analyze product image to detect color and object type using Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert e-commerce qui identifie les produits sur des photos. Réponds toujours en français, concis.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identifie la COULEUR dominante (un mot simple, ex: 'Rouge', 'Bleu marine') et le TYPE D'OBJET (ex: 'T-shirt', 'Robe', 'Chaussures', 'Sac à main') sur cette image.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_product",
              description: "Renvoie la couleur et le type d'objet identifiés.",
              parameters: {
                type: "object",
                properties: {
                  color: { type: "string", description: "Couleur dominante en français, un mot." },
                  object_type: { type: "string", description: "Type d'objet en français (catégorie courte)." },
                },
                required: ["color", "object_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_product" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans votre workspace Lovable." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error", response.status, txt);
      return new Response(JSON.stringify({ error: "Échec de l'analyse IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let color = "";
    let object_type = "";
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        color = String(parsed.color ?? "").trim();
        object_type = String(parsed.object_type ?? "").trim();
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(JSON.stringify({ color, object_type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-image error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
