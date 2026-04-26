import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Store, Sparkles, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  logo_url: z.string().trim().url("URL invalide").max(500).optional().or(z.literal("")),
  banner_url: z.string().trim().url("URL invalide").max(500).optional().or(z.literal("")),
});

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

export default function ShopOnboarding() {
  const { user, refreshRoles } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ name: "", description: "", city: "", phone: "", logo_url: "", banner_url: "" });

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Connectez-vous pour ouvrir votre boutique.</p>
        <Button asChild className="mt-4"><a href="/auth?mode=signup">Créer un compte</a></Button>
      </div>
    );
  }

  const steps = [
    { title: "Identité", desc: "Le nom et la ville de votre boutique." },
    { title: "Présentation", desc: "Décrivez votre boutique en quelques mots." },
    { title: "Visuels", desc: "Logo et bannière (optionnels)." },
  ];

  async function submit() {
    const parsed = schema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const slugBase = slugify(parsed.data.name);
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: shop, error } = await supabase.from("shops").insert({
      owner_id: user!.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      city: parsed.data.city,
      phone: parsed.data.phone || null,
      logo_url: parsed.data.logo_url || null,
      banner_url: parsed.data.banner_url || null,
    }).select().single();
    if (error) { setLoading(false); return toast.error(error.message); }

    // Grant vendor role
    await supabase.from("user_roles").insert({ user_id: user!.id, role: "vendor" }).select();
    await refreshRoles();
    setLoading(false);
    toast.success("Boutique créée ! Bienvenue sur Madina.");
    nav("/vendor");
  }

  return (
    <div className="container max-w-2xl py-10 md:py-16 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-gold shadow-gold grid place-items-center mb-4">
          <Store className="h-6 w-6 text-secondary-foreground" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Ouvrez votre boutique</h1>
        <p className="text-muted-foreground mt-2">Trois étapes simples pour rejoindre Madina.</p>
      </div>

      <ol className="flex items-center gap-2 mb-10">
        {steps.map((s, i) => (
          <li key={i} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-smooth ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-smooth ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </li>
        ))}
      </ol>

      <div className="bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-xl font-semibold">{steps[step].title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{steps[step].desc}</p>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nom de la boutique *</Label><Input maxLength={80} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Ex. Boutique Aïssata" /></div>
            <div className="space-y-1.5"><Label>Ville *</Label><Input maxLength={60} value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} placeholder="Conakry" /></div>
            <div className="space-y-1.5"><Label>Téléphone</Label><Input maxLength={40} value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+224 ..." /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-1.5"><Label>Description</Label><Textarea maxLength={500} rows={6} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Que vendez-vous ? Quelle est l'âme de votre boutique ?" /></div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>URL du logo</Label><Input value={data.logo_url} onChange={(e) => setData({ ...data, logo_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1.5"><Label>URL de la bannière</Label><Input value={data.banner_url} onChange={(e) => setData({ ...data, banner_url: e.target.value })} placeholder="https://..." /></div>
            <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 text-xs text-muted-foreground flex gap-2">
              <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Vous pouvez ajouter ou changer ces images plus tard depuis votre tableau de bord.</span>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-8">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Retour</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && (!data.name || !data.city)}>Continuer <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={loading} className="bg-gradient-gold text-secondary-foreground shadow-gold">
              {loading ? "Création..." : "Créer ma boutique"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
