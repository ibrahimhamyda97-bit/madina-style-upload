import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Store, Sparkles, Check, ArrowRight, ArrowLeft, Upload, FileCheck2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";

const baseSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  city: z.string().trim().min(2, "Ville requise").max(60),
  phone: z.string().trim().min(6, "Téléphone requis").max(40),
});

const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

export default function ShopOnboarding() {
  const { user, refreshRoles } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [idUploading, setIdUploading] = useState(false);
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [data, setData] = useState({
    name: "", description: "", city: "", phone: "",
    logo_url: "", banner_url: "", id_document_url: "",
  });

  // Charger boutique existante (reprise) ou pré-remplir depuis profil
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("shops")
        .select("id, name, description, city, phone, logo_url, banner_url, id_document_url")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (existing) {
        setShopId(existing.id);
        setData({
          name: existing.name || "",
          description: existing.description || "",
          city: existing.city || "",
          phone: existing.phone || "",
          logo_url: existing.logo_url || "",
          banner_url: existing.banner_url || "",
          id_document_url: existing.id_document_url || "",
        });
        if (existing.id_document_url) setIdFileName("Pièce téléversée");
      } else {
        const { data: p } = await supabase.from("profiles").select("phone, city").eq("id", user.id).maybeSingle();
        if (p) setData((d) => ({ ...d, phone: d.phone || p.phone || "", city: d.city || p.city || "" }));
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Connectez-vous pour ouvrir votre boutique.</p>
        <Button asChild className="mt-4"><a href="/auth?mode=signup">Créer un compte</a></Button>
      </div>
    );
  }

  const steps = [
    { title: "Identité", desc: "Le nom, la ville et le téléphone de votre boutique." },
    { title: "Présentation", desc: "Décrivez votre boutique en quelques mots." },
    { title: "Visuels", desc: "Logo et bannière (optionnels)." },
    { title: "Vérification", desc: "Téléversez votre pièce d'identité pour validation par l'admin." },
  ];

  // Crée la boutique dès l'étape 1 (status = pending). L'admin la voit immédiatement.
  async function ensureShopCreated() {
    if (shopId) return shopId;
    const parsed = baseSchema.safeParse(data);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return null; }
    setSaving(true);
    const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: inserted, error } = await supabase.from("shops").insert({
      owner_id: user!.id,
      name: parsed.data.name,
      slug,
      city: parsed.data.city,
      phone: parsed.data.phone,
      status: "pending",
    }).select("id").single();
    if (error) { setSaving(false); toast.error(error.message); return null; }
    // Donner le rôle vendor dès maintenant
    await supabase.from("user_roles").insert({ user_id: user!.id, role: "vendor" });
    await refreshRoles();
    setShopId(inserted.id);
    setSaving(false);
    toast.success("Boutique enregistrée — finalisez votre dossier");
    return inserted.id;
  }

  async function patchShop(patch: Partial<{ description: string | null; logo_url: string | null; banner_url: string | null; id_document_url: string }>) {
    if (!shopId) return;
    const { error } = await supabase.from("shops").update(patch).eq("id", shopId);
    if (error) toast.error(error.message);
  }

  async function handleIdUpload(file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Fichier trop lourd (max 5 Mo)");
    setIdUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("identity-documents").upload(path, file, {
      upsert: false, contentType: file.type,
    });
    setIdUploading(false);
    if (error) return toast.error(error.message);
    setData((d) => ({ ...d, id_document_url: path }));
    setIdFileName(file.name);
    if (shopId) await patchShop({ id_document_url: path });
    toast.success("Pièce d'identité téléversée");
  }

  async function next() {
    if (step === 0) {
      const id = await ensureShopCreated();
      if (!id) return;
      setStep(1);
    } else if (step === 1) {
      await patchShop({ description: data.description || null });
      setStep(2);
    } else if (step === 2) {
      await patchShop({ logo_url: data.logo_url || null, banner_url: data.banner_url || null });
      setStep(3);
    }
  }

  async function finish() {
    if (!data.id_document_url) return toast.error("Pièce d'identité requise");
    if (!shopId) return;
    await patchShop({ id_document_url: data.id_document_url });
    toast.success("Demande envoyée ! L'admin va vérifier votre dossier.");
    nav("/vendor");
  }

  const canContinue = () => {
    if (step === 0) return data.name.trim().length >= 2 && data.city.trim().length >= 2 && data.phone.trim().length >= 6;
    if (step === 3) return !!data.id_document_url;
    return true;
  };

  return (
    <div className="container max-w-2xl py-10 md:py-16 animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-gold shadow-gold grid place-items-center mb-4">
          <Store className="h-6 w-6 text-secondary-foreground" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Ouvrez votre boutique</h1>
        <p className="text-muted-foreground mt-2">Quatre étapes pour rejoindre Madina.</p>
        {shopId && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-secondary/15 text-xs font-medium text-secondary-foreground">
            <Clock className="h-3 w-3" /> Demande enregistrée — en attente de validation
          </div>
        )}
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
            <div className="space-y-1.5"><Label>Téléphone *</Label><Input maxLength={40} value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="+224 ..." /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-1.5"><Label>Description</Label><Textarea maxLength={500} rows={6} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Que vendez-vous ? Quelle est l'âme de votre boutique ?" /></div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <ImageUploader userId={user.id} folder="shop-logos" value={data.logo_url} onChange={(url) => setData({ ...data, logo_url: url })} label="Logo de la boutique" aspect="square" maxSizeMb={2} />
            <ImageUploader userId={user.id} folder="shop-banners" value={data.banner_url} onChange={(url) => setData({ ...data, banner_url: url })} label="Bannière" aspect="banner" maxSizeMb={5} />
            <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 text-xs text-muted-foreground flex gap-2">
              <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
              <span>Vous pouvez ajouter ou changer ces images plus tard depuis votre tableau de bord.</span>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6">
              <div className="text-center">
                {data.id_document_url ? (
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 grid place-items-center mb-3">
                      <FileCheck2 className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{idFileName || "Pièce téléversée"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Téléversement réussi</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Téléverser une pièce d'identité</p>
                    <p className="text-xs text-muted-foreground mt-1">Carte d'identité, passeport ou permis (PDF / JPG / PNG, 5 Mo max)</p>
                  </>
                )}
                <label className="inline-block mt-4">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIdUpload(f); }}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-smooth">
                    {idUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {data.id_document_url ? "Remplacer" : "Choisir un fichier"}
                  </span>
                </label>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
              🔒 Votre pièce d'identité est stockée de façon sécurisée et n'est visible que par vous et l'équipe Madina.
            </div>
          </div>
        )}

        <div className="flex justify-between pt-8">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Retour</Button>
          {step < steps.length - 1 ? (
            <Button onClick={next} disabled={!canContinue() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continuer <ArrowRight className="h-4 w-4" /></>}
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canContinue()} className="bg-gradient-gold text-secondary-foreground shadow-gold">
              Finaliser ma demande
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
