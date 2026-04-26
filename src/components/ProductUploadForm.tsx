import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Image as ImageIcon, Upload, Sparkles, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LETTER_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const NUMERIC_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"] as const;
const SIZES = [...LETTER_SIZES, ...NUMERIC_SIZES] as const;
type Size = typeof SIZES[number];

const CATEGORIES = ["Vêtements", "Chaussures", "Accessoires", "Sacs", "Bijoux", "Beauté", "Maison", "Enfants", "Autre"];

interface AdminImage {
  id: string;
  url: string;
  size: Size;
  detectedColor: string | null;
  loading: boolean;
}

interface VendorSlotState {
  preview: string | null;
  uploadedUrl: string | null;
  file: File | null;
  detectedColor: string | null;
  loading: boolean;
}

const emptyVendorSlot = (): VendorSlotState => ({ preview: null, uploadedUrl: null, file: null, detectedColor: null, loading: false });

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

  // Admin mode: dynamic list of {url, size}
  const [adminImages, setAdminImages] = useState<AdminImage[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentSize, setCurrentSize] = useState<Size>("M");

  // Vendor mode: 5 slot uploader (one per size)
  const [vendorSlots, setVendorSlots] = useState<Record<Size, VendorSlotState>>(() =>
    Object.fromEntries(LETTER_SIZES.map((s) => [s, emptyVendorSlot()])) as Record<Size, VendorSlotState>
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

  async function analyzeAndApply(imageUrl: string, onColor: (c: string | null) => void) {
    try {
      const { data, error } = await supabase.functions.invoke("analyze-image", { body: { imageUrl } });
      if (error) throw error;
      const color = data?.color || null;
      const objType = data?.object_type || null;
      onColor(color);
      if (color && !detectedColor) setDetectedColor(color);
      if (objType && !detectedType) {
        setDetectedType(objType);
        if (!title) setTitle(objType);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Échec de la détection IA");
      onColor(null);
    }
  }

  // -------- Admin handlers --------
  function addAdminImage() {
    const url = currentUrl.trim();
    if (!url) return toast.error("Saisissez une URL d'image");
    try { new URL(url); } catch { return toast.error("URL invalide"); }

    const id = crypto.randomUUID();
    const item: AdminImage = { id, url, size: currentSize, detectedColor: null, loading: true };
    setAdminImages((prev) => [...prev, item]);
    setCurrentUrl("");
    analyzeAndApply(url, (color) => {
      setAdminImages((prev) => prev.map((it) => it.id === id ? { ...it, detectedColor: color, loading: false } : it));
    });
  }

  function removeAdminImage(id: string) {
    setAdminImages((prev) => prev.filter((it) => it.id !== id));
  }

  function updateAdminSize(id: string, size: Size) {
    setAdminImages((prev) => prev.map((it) => it.id === id ? { ...it, size } : it));
  }

  // -------- Vendor handlers --------
  async function handleVendorFile(size: Size, file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde (max 5 Mo)");
    const localPreview = URL.createObjectURL(file);
    setVendorSlots((prev) => ({ ...prev, [size]: { ...emptyVendorSlot(), preview: localPreview, file, loading: true } }));

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${size}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast.error(error.message);
      setVendorSlots((prev) => ({ ...prev, [size]: emptyVendorSlot() }));
      return;
    }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    setVendorSlots((prev) => ({ ...prev, [size]: { ...prev[size], uploadedUrl: publicUrl, preview: publicUrl, loading: false } }));
    analyzeAndApply(publicUrl, (color) => {
      setVendorSlots((prev) => ({ ...prev, [size]: { ...prev[size], detectedColor: color } }));
    });
  }

  function clearVendorSlot(size: Size) {
    setVendorSlots((prev) => ({ ...prev, [size]: emptyVendorSlot() }));
  }

  // -------- Submit --------
  async function submit() {
    if (!user) return;
    const parsed = schema.safeParse({ shop_id: shopId, title, description, price_gnf: price, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    let imageRows: { image_url: string; size: Size; detected_color: string | null; position: number }[] = [];
    if (mode === "admin") {
      if (adminImages.length === 0) return toast.error("Ajoutez au moins une image");
      imageRows = adminImages.map((it, i) => ({ image_url: it.url, size: it.size, detected_color: it.detectedColor, position: i }));
    } else {
      const filled = LETTER_SIZES.filter((s) => vendorSlots[s]?.uploadedUrl);
      if (filled.length === 0) return toast.error("Ajoutez au moins une image");
      imageRows = filled.map((s, i) => ({ image_url: vendorSlots[s].uploadedUrl!, size: s, detected_color: vendorSlots[s].detectedColor, position: i }));
    }

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

    const rows = imageRows.map((r) => ({ ...r, product_id: prod.id }));
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
            {mode === "admin" ? "Mode Admin — Ajout d'images via URL" : "Mode Vendeur — Upload depuis l'appareil"}
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold">
          {mode === "admin" ? "Ajoutez vos images, une par une" : "5 images, une par taille"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "admin"
            ? "Collez l'URL d'une image, choisissez la taille correspondante puis cliquez sur + pour l'ajouter. Répétez pour ajouter d'autres images au même article."
            : "Chaque image correspond à une taille. La couleur et le type d'objet sont détectés automatiquement."}
        </p>

        {mode === "admin" ? (
          <AdminImageManager
            images={adminImages}
            currentUrl={currentUrl}
            currentSize={currentSize}
            onUrlChange={setCurrentUrl}
            onSizeChange={setCurrentSize}
            onAdd={addAdminImage}
            onRemove={removeAdminImage}
            onUpdateSize={updateAdminSize}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            {LETTER_SIZES.map((s) => (
              <VendorSlotCard
                key={s}
                size={s}
                state={vendorSlots[s]}
                onFile={(f) => handleVendorFile(s, f)}
                onClear={() => clearVendorSlot(s)}
              />
            ))}
          </div>
        )}

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

function AdminImageManager({
  images, currentUrl, currentSize, onUrlChange, onSizeChange, onAdd, onRemove, onUpdateSize,
}: {
  images: AdminImage[];
  currentUrl: string;
  currentSize: Size;
  onUrlChange: (v: string) => void;
  onSizeChange: (s: Size) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdateSize: (id: string, s: Size) => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">URL de l'image</Label>
          <Input
            value={currentUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
            placeholder="https://exemple.com/image.jpg"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 md:w-32">
          <Label className="text-xs">Taille</Label>
          <Select value={currentSize} onValueChange={(v) => onSizeChange(v as Size)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Vêtements</div>
              {LETTER_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t mt-1">Pointures</div>
              {NUMERIC_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          size="lg"
          className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
        >
          <Plus className="h-5 w-5" /> Ajouter
        </Button>
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 py-10 grid place-items-center text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Aucune image ajoutée. Collez une URL et cliquez sur + Ajouter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.id} className="rounded-2xl border border-border bg-background overflow-hidden flex flex-col shadow-soft">
              <div className="aspect-square bg-muted relative">
                <img src={img.url} alt={`Taille ${img.size}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => onRemove(img.id)}
                  aria-label="Supprimer"
                  className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                >
                  <X className="h-4 w-4" />
                </button>
                {img.loading && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm grid place-items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                <Select value={img.size} onValueChange={(v) => onUpdateSize(img.id, v as Size)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Vêtements</div>
                    {LETTER_SIZES.map((s) => <SelectItem key={s} value={s}>Taille {s}</SelectItem>)}
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t mt-1">Pointures</div>
                    {NUMERIC_SIZES.map((s) => <SelectItem key={s} value={s}>Pointure {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {img.detectedColor && (
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                    Couleur : <strong className="text-foreground">{img.detectedColor}</strong>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorSlotCard({ size, state, onFile, onClear }: {
  size: Size; state: VendorSlotState;
  onFile: (f: File) => void; onClear: () => void;
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
            <Upload className="h-5 w-5 text-muted-foreground" />
            <input type="file" accept="image/*" capture="environment" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </label>
        )}
        {state.loading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
      {state.detectedColor && (
        <div className="px-3 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Couleur : <strong className="text-foreground">{state.detectedColor}</strong></span>
        </div>
      )}
    </div>
  );
}
