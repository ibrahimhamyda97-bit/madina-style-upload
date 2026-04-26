import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Image as ImageIcon, X, Loader2, Plus, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LETTER_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const NUMERIC_SIZES = ["36","37","38","39","40","41","42","43","44","45"] as const;
const SIZES = [...LETTER_SIZES, ...NUMERIC_SIZES] as const;
type Size = typeof SIZES[number];

const CATEGORIES = ["Vêtements", "Chaussures", "Accessoires", "Sacs", "Bijoux", "Beauté", "Maison", "Enfants", "Autre"];

interface PhotoItem { id: string; url: string; size: Size | null; loading: boolean; }

const schema = z.object({
  shop_id: z.string().uuid("Sélectionnez une boutique"),
  title: z.string().trim().min(2, "Titre trop court").max(120),
  description: z.string().trim().min(2, "Description requise").max(2000),
  price_gnf: z.coerce.number().int().positive("Prix invalide"),
  category: z.string().trim().min(1, "Catégorie requise"),
});

interface Props { mode: "admin" | "vendor" }

export default function ProductUploadForm({ mode }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [shops, setShops] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [shopId, setShopId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [adminUrl, setAdminUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = mode === "admin"
      ? supabase.from("shops").select("id,name,status").order("name")
      : supabase.from("shops").select("id,name,status").eq("owner_id", user.id).eq("status", "approved").order("name");
    q.then(({ data }) => {
      const list = (data ?? []) as any;
      setShops(list);
      if (list.length === 1) setShopId(list[0].id);
    });
  }, [user, mode]);

  // -------- Vendor: file upload to bucket --------
  async function handleVendorFiles(files: FileList | null) {
    if (!user || !files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} : trop lourd (5 Mo max)`); continue; }
      const id = crypto.randomUUID();
      setPhotos((p) => [...p, { id, url: "", size: null, loading: true }]);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${id}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(error.message);
        setPhotos((p) => p.filter((it) => it.id !== id));
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      setPhotos((p) => p.map((it) => it.id === id ? { ...it, url: pub.publicUrl, loading: false } : it));
    }
  }

  // -------- Admin: add via URL --------
  function addAdminUrl() {
    const url = adminUrl.trim();
    if (!url) return toast.error("Saisissez une URL");
    try { new URL(url); } catch { return toast.error("URL invalide"); }
    setPhotos((p) => [...p, { id: crypto.randomUUID(), url, size: null, loading: false }]);
    setAdminUrl("");
  }

  function removePhoto(id: string) { setPhotos((p) => p.filter((it) => it.id !== id)); }
  function updatePhotoSize(id: string, size: Size | null) {
    setPhotos((p) => p.map((it) => it.id === id ? { ...it, size } : it));
  }

  async function submit() {
    if (!user) return;
    const parsed = schema.safeParse({ shop_id: shopId, title, description, price_gnf: price, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (photos.length === 0) return toast.error("Ajoutez au moins une photo");
    if (photos.some((p) => p.loading)) return toast.error("Attendez la fin du téléversement");

    setSubmitting(true);
    const { data: prod, error } = await supabase.from("products").insert({
      shop_id: parsed.data.shop_id,
      title: parsed.data.title,
      description: parsed.data.description,
      price_gnf: parsed.data.price_gnf,
      category: parsed.data.category,
      detected_color: color || null,
      created_by: user.id,
    }).select().single();

    if (error || !prod) { setSubmitting(false); return toast.error(error?.message || "Erreur"); }

    // size defaults to "M" if not provided (DB requires non-null size on product_images)
    const rows = photos.map((p, i) => ({
      product_id: prod.id,
      image_url: p.url,
      size: (p.size ?? "M") as Size,
      detected_color: color || null,
      position: i,
    }));
    const { error: imgErr } = await supabase.from("product_images").insert(rows);
    setSubmitting(false);
    if (imgErr) return toast.error(imgErr.message);
    toast.success("Produit publié sur Madina !");
    nav(mode === "admin" ? "/admin/products" : "/vendor/products");
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Photos */}
      <div className="bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos du produit *
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold">Ajoutez vos photos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Au moins une photo est requise. Vous pouvez préciser la taille et la couleur si nécessaire — c'est optionnel.
        </p>

        {mode === "admin" ? (
          <div className="mt-6 flex flex-col md:flex-row gap-2">
            <Input
              value={adminUrl}
              onChange={(e) => setAdminUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAdminUrl(); } }}
              placeholder="https://exemple.com/image.jpg"
              className="h-11"
            />
            <Button onClick={addAdminUrl} className="h-11"><Plus className="h-5 w-5" /> Ajouter</Button>
          </div>
        ) : (
          <label className="mt-6 block">
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleVendorFiles(e.target.files)} />
            <span className="block rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-smooth py-8 cursor-pointer text-center">
              <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-sm">Cliquez pour téléverser des photos</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG — 5 Mo max par image</p>
            </span>
          </label>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-5">
            {photos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-background overflow-hidden flex flex-col shadow-soft">
                <div className="aspect-square bg-muted relative">
                  {p.loading ? (
                    <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : (
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                    aria-label="Supprimer"
                  ><X className="h-4 w-4" /></button>
                </div>
                <div className="p-2">
                  <Select value={p.size ?? "none"} onValueChange={(v) => updatePhotoSize(p.id, v === "none" ? null : v as Size)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Taille (optionnel)" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="none">Sans taille</SelectItem>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Vêtements</div>
                      {LETTER_SIZES.map((s) => <SelectItem key={s} value={s}>Taille {s}</SelectItem>)}
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t mt-1">Pointures</div>
                      {NUMERIC_SIZES.map((s) => <SelectItem key={s} value={s}>Pointure {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && mode === "admin" && (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-border bg-muted/30 py-10 grid place-items-center text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucune photo ajoutée.</p>
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <h2 className="font-display text-xl font-bold mb-6">Détails du produit</h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>Boutique *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.status && s.status !== "approved" ? ` (${s.status})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            {mode === "vendor" && shops.length === 0 && (
              <p className="text-xs text-amber-600">Aucune boutique validée — l'admin doit valider votre boutique avant que vous ne puissiez publier.</p>
            )}
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
          <div className="space-y-1.5">
            <Label>Couleur (optionnel)</Label>
            <Input maxLength={40} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Bleu marine, Rouge..." />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description *</Label>
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
