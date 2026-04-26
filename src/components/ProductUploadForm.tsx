import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Image as ImageIcon, Upload, Sparkles, X, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;
type Size = typeof SIZES[number];

const CATEGORIES = ["Vêtements", "Chaussures", "Accessoires", "Sacs", "Bijoux", "Beauté", "Maison", "Enfants", "Autre"];

interface SlotState {
  preview: string | null;     // local preview or fetched URL
  uploadedUrl: string | null; // final remote URL
  file: File | null;
  url: string;                // raw URL for admin mode
  detectedColor: string | null;
  loading: boolean;
}

const emptySlot = (): SlotState => ({ preview: null, uploadedUrl: null, file: null, url: "", detectedColor: null, loading: false });

const schema = z.object({
  shop_id: z.string().uuid("Sélectionnez une boutique"),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price_gnf: z.coerce.number().int().positive("Prix invalide"),
  category: z.string().trim().min(1, "Catégorie requise"),
});

interface Props { mode: "admin" | "vendor" }

export default function ProductUploadForm({ mode }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [shopId, setShopId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [detectedColor, setDetectedColor] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [slots, setSlots] = useState<Record<Size, SlotState>>(() =>
    Object.fromEntries(SIZES.map((s) => [s, emptySlot()])) as Record<Size, SlotState>
  );

  useEffect(() => {
    if (!user) return;
    const q = mode === "admin"
      ? supabase.from("shops").select("id,name").order("name")
      : supabase.from("shops").select("id,name").eq("owner_id", user.id).order("name");
    q.then(({ data }) => {
      const list = (data ?? []) as any;
      setShops(list);
      if (list.length === 1) setShopId(list[0].id);
    });
  }, [user, mode]);

  async function analyze(size: Size, imageUrl: string) {
    setSlots((prev) => ({ ...prev, [size]: { ...prev[size], loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke("analyze-image", { body: { imageUrl } });
      if (error) throw error;
      const color = data?.color || null;
      const objType = data?.object_type || null;
      setSlots((prev) => ({ ...prev, [size]: { ...prev[size], detectedColor: color, loading: false } }));
      // Pre-fill global if still empty
      if (color && !detectedColor) setDetectedColor(color);
      if (objType && !detectedType) {
        setDetectedType(objType);
        if (!title) setTitle(objType);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Échec de la détection IA");
      setSlots((prev) => ({ ...prev, [size]: { ...prev[size], loading: false } }));
    }
  }

  async function handleFile(size: Size, file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde (max 5 Mo)");
    const localPreview = URL.createObjectURL(file);
    setSlots((prev) => ({ ...prev, [size]: { ...emptySlot(), preview: localPreview, file, loading: true } }));

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${size}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast.error(error.message);
      setSlots((prev) => ({ ...prev, [size]: emptySlot() }));
      return;
    }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    setSlots((prev) => ({ ...prev, [size]: { ...prev[size], uploadedUrl: publicUrl, preview: publicUrl, loading: false } }));
    analyze(size, publicUrl);
  }

  function handleUrl(size: Size, url: string) {
    setSlots((prev) => ({ ...prev, [size]: { ...prev[size], url } }));
  }

  function commitUrl(size: Size) {
    const url = slots[size].url.trim();
    if (!url) return;
    try { new URL(url); } catch { return toast.error("URL invalide"); }
    setSlots((prev) => ({ ...prev, [size]: { ...prev[size], preview: url, uploadedUrl: url } }));
    analyze(size, url);
  }

  function clearSlot(size: Size) {
    setSlots((prev) => ({ ...prev, [size]: emptySlot() }));
  }

  async function submit() {
    if (!user) return;
    const parsed = schema.safeParse({ shop_id: shopId, title, description, price_gnf: price, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const filledImages = SIZES.filter((s) => slots[s].uploadedUrl);
    if (filledImages.length === 0) return toast.error("Ajoutez au moins une image");

    setSubmitting(true);
    const { data: prod, error } = await supabase.from("products").insert({
      shop_id: parsed.data.shop_id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      price_gnf: parsed.data.price_gnf,
      category: parsed.data.category,
      detected_color: detectedColor,
      detected_object_type: detectedType,
      created_by: user.id,
    }).select().single();

    if (error || !prod) { setSubmitting(false); return toast.error(error?.message || "Erreur création produit"); }

    const rows = filledImages.map((s, i) => ({
      product_id: prod.id,
      image_url: slots[s].uploadedUrl!,
      size: s,
      position: SIZES.indexOf(s),
      detected_color: slots[s].detectedColor,
    }));
    const { error: imgErr } = await supabase.from("product_images").insert(rows);
    setSubmitting(false);
    if (imgErr) return toast.error(imgErr.message);
    toast.success("Produit publié sur Madina !");
    nav(mode === "admin" ? "/admin" : "/vendor");
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {mode === "admin" ? "Mode Admin — Images via URL" : "Mode Vendeur — Upload depuis l'appareil"}
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold">5 images, une par taille</h2>
        <p className="text-sm text-muted-foreground mt-1">Chaque image correspond à une taille. La couleur et le type d'objet sont détectés automatiquement.</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          {SIZES.map((s) => (
            <SlotCard
              key={s}
              size={s}
              mode={mode}
              state={slots[s]}
              onFile={(f) => handleFile(s, f)}
              onUrlChange={(v) => handleUrl(s, v)}
              onCommitUrl={() => commitUrl(s)}
              onClear={() => clearSlot(s)}
            />
          ))}
        </div>

        {(detectedColor || detectedType) && (
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {detectedColor && <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">Couleur : {detectedColor}</span>}
            {detectedType && <span className="px-3 py-1.5 rounded-full bg-secondary/15 text-secondary-foreground font-medium">Type : {detectedType}</span>}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-xl font-bold mb-6">Détails du produit</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>Boutique *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Titre *</Label>
            <Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Robe Wax Émeraude" />
          </div>
          <div className="space-y-1.5">
            <Label>Prix (GNF) *</Label>
            <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tissu, finition, conseils d'entretien..." />
          </div>
        </div>

        <Button onClick={submit} disabled={submitting} size="lg" className="w-full md:w-auto md:px-10 mt-8 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold hover:opacity-95">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publication...</> : "Publier le produit"}
        </Button>
      </div>
    </div>
  );
}

function SlotCard({ size, mode, state, onFile, onUrlChange, onCommitUrl, onClear }: {
  size: Size; mode: "admin" | "vendor"; state: SlotState;
  onFile: (f: File) => void; onUrlChange: (v: string) => void; onCommitUrl: () => void; onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-background overflow-hidden flex flex-col transition-smooth hover:border-primary/40">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="font-display font-bold text-sm text-primary">{size}</span>
        {state.preview && (
          <button onClick={onClear} aria-label="Supprimer" className="text-muted-foreground hover:text-destructive p-1 -mr-1"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>
      <div className="aspect-square bg-muted relative">
        {state.preview ? (
          <img src={state.preview} alt={`Taille ${size}`} className="h-full w-full object-cover" />
        ) : (
          <label className="absolute inset-0 grid place-items-center cursor-pointer hover:bg-muted/70 transition-smooth">
            {mode === "vendor" ? (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <input type="file" accept="image/*" capture="environment" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
              </>
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </label>
        )}
        {state.loading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {mode === "admin" && !state.preview && (
        <div className="p-2 flex gap-1">
          <Input
            value={state.url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onCommitUrl(); } }}
            placeholder="https://..."
            className="h-8 text-xs"
          />
          <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={onCommitUrl}>
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {state.detectedColor && (
        <div className="px-3 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Couleur : <strong className="text-foreground">{state.detectedColor}</strong></span>
        </div>
      )}
    </div>
  );
}
