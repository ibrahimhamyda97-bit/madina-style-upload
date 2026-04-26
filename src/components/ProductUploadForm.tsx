import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Image as ImageIcon, X, Loader2, Plus, Sparkles, Upload, Wallet, ShieldCheck, Truck, Tag, Palette, Ruler, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VariantsEditor, { DraftVariant, persistVariants } from "@/components/VariantsEditor";

const LETTER_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const NUMERIC_SIZES = ["36","37","38","39","40","41","42","43","44","45"] as const;
const SIZES = [...LETTER_SIZES, ...NUMERIC_SIZES] as const;
type Size = typeof SIZES[number];

// Catégories groupées. Les sous-catégories de Vêtements sont stockées telles quelles
// (ex: "Vêtements - Robes") pour rester filtrables côté boutique.
const CATEGORY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Vêtements",
    items: [
      "Vêtements - Robes",
      "Vêtements - Vestes",
      "Vêtements - Blazers",
      "Vêtements - Pantalons",
      "Vêtements - Jeans",
      "Vêtements - Chemises",
      "Vêtements - T-shirts",
      "Vêtements - Pulls & Sweats",
      "Vêtements - Jupes",
      "Vêtements - Shorts",
      "Vêtements - Manteaux",
      "Vêtements - Sous-vêtements",
      "Vêtements - Tenues traditionnelles",
      "Vêtements - Autre",
    ],
  },
  { label: "Chaussures", items: ["Chaussures"] },
  { label: "Accessoires", items: ["Accessoires", "Sacs", "Bijoux"] },
  { label: "Beauté", items: ["Beauté"] },
  {
    label: "Électronique",
    items: ["Téléphones", "Ordinateurs", "Tablettes", "Accessoires Tech"],
  },
  { label: "Maison", items: ["Maison"] },
  { label: "Enfants", items: ["Enfants"] },
  { label: "Autre", items: ["Autre"] },
];
const CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);

// Palette de couleurs par défaut sélectionnables (nom FR + swatch HEX).
// `swatch` est uniquement visuel — la valeur enregistrée reste le nom (ex: "Bleu marine").
const COLOR_PRESETS: { name: string; swatch: string }[] = [
  { name: "Noir", swatch: "#111111" },
  { name: "Blanc", swatch: "#ffffff" },
  { name: "Gris", swatch: "#9ca3af" },
  { name: "Beige", swatch: "#e7d3b1" },
  { name: "Marron", swatch: "#7a4a2b" },
  { name: "Rouge", swatch: "#dc2626" },
  { name: "Bordeaux", swatch: "#7f1d1d" },
  { name: "Rose", swatch: "#f472b6" },
  { name: "Orange", swatch: "#f97316" },
  { name: "Jaune", swatch: "#facc15" },
  { name: "Vert", swatch: "#16a34a" },
  { name: "Vert émeraude", swatch: "#047857" },
  { name: "Bleu ciel", swatch: "#38bdf8" },
  { name: "Bleu", swatch: "#2563eb" },
  { name: "Bleu marine", swatch: "#1e3a8a" },
  { name: "Violet", swatch: "#7c3aed" },
  { name: "Doré", swatch: "#d4af37" },
  { name: "Argenté", swatch: "#c0c0c0" },
  { name: "Multicolore", swatch: "linear-gradient(135deg,#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6)" },
];

interface PhotoItem {
  id: string;
  url: string;
  loading: boolean;
  // Per-image overrides (admin)
  price?: string;
  color?: string;
  sizes?: Size[];
  title?: string;
  expanded?: boolean;
}

const schema = z.object({
  shop_id: z.string().uuid("Sélectionnez une boutique"),
  title: z.string().trim().min(2, "Titre trop court").max(120),
  description: z.string().trim().min(2, "Description requise").max(2000),
  price_gnf: z.coerce.number().int().positive("Prix invalide"),
  category: z.string().trim().min(1, "Catégorie requise"),
});

interface Props { mode: "admin" | "vendor" }

const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

export default function ProductUploadForm({ mode }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [shops, setShops] = useState<{ id: string; name: string; status?: string; commission_rate?: number }[]>([]);
  const [shopId, setShopId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [shippingFee, setShippingFee] = useState(""); // admin only
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [adminUrl, setAdminUrl] = useState("");
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (mode === "admin") {
      // En mode admin : on charge TOUTES les boutiques (la policy admin l'autorise).
      // Les 5 boutiques officielles ZARA / NOCIBE / SHEIN / TÉLÉPHONE / ORDINATEUR
      // sont mises en tête de liste.
      console.log("[ProductUploadForm] Loading shops for admin user:", user.id);
      supabase
        .from("shops")
        .select("id,name,status,commission_rate")
        .order("name", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error("[ProductUploadForm] shops fetch error:", error);
            toast.error(`Boutiques: ${error.message}`);
            return;
          }
          console.log("[ProductUploadForm] shops loaded:", data?.length, data);
          // Dédupliquer par id (au cas où)
          const map = new Map<string, any>();
          (data ?? []).forEach((s: any) => { if (!map.has(s.id)) map.set(s.id, s); });
          const officialOrder = ["ZARA", "NOCIBE", "SHEIN", "TÉLÉPHONE", "TELEPHONE", "ORDINATEUR"];
          const list = Array.from(map.values()).sort((a, b) => {
            const ia = officialOrder.indexOf((a.name || "").toUpperCase());
            const ib = officialOrder.indexOf((b.name || "").toUpperCase());
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return (a.name || "").localeCompare(b.name || "");
          });
          setShops(list);
          if (list.length === 1) setShopId(list[0].id);
        });
    } else {
      supabase
        .from("shops")
        .select("id,name,status,commission_rate,created_at")
        .eq("owner_id", user.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .limit(1)
        .then(({ data, error }) => {
          if (error) { toast.error(error.message); return; }
          const list = (data ?? []) as any;
          setShops(list);
          if (list.length === 1) setShopId(list[0].id);
        });
    }
  }, [user, mode]);

  const selectedShop = useMemo(() => shops.find((s) => s.id === shopId), [shops, shopId]);
  const commissionRate = Number(selectedShop?.commission_rate ?? 10);
  const priceNum = Number(price) || 0;
  const commissionAmount = Math.round(priceNum * (commissionRate / 100));
  const netAmount = Math.max(0, priceNum - commissionAmount);

  function toggleSize(s: Size) {
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function togglePhotoSize(photoId: string, s: Size) {
    setPhotos((prev) => prev.map((p) => {
      if (p.id !== photoId) return p;
      const current = p.sizes ?? [];
      return { ...p, sizes: current.includes(s) ? current.filter((x) => x !== s) : [...current, s] };
    }));
  }

  function updatePhoto(id: string, patch: Partial<PhotoItem>) {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }

  // -------- Vendor: file upload to bucket --------
  async function handleVendorFiles(files: FileList | null) {
    if (!user || !files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} : trop lourd (5 Mo max)`); continue; }
      const id = crypto.randomUUID();
      setPhotos((p) => [...p, { id, url: "", loading: true }]);
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
    setPhotos((p) => [...p, { id: crypto.randomUUID(), url, loading: false, expanded: true }]);
    setAdminUrl("");
  }

  function removePhoto(id: string) { setPhotos((p) => p.filter((it) => it.id !== id)); }

  async function submit() {
    if (!user) return;
    if (photos.length === 0) return toast.error("Ajoutez au moins une photo");
    if (photos.some((p) => p.loading)) return toast.error("Attendez la fin du téléversement");

    // Common validation (description, category, shop, base title, base price)
    const parsed = schema.safeParse({ shop_id: shopId, title, description, price_gnf: price, category });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSubmitting(true);

    if (mode === "admin") {
      // Each image with overrides becomes ITS OWN product (so each can have its own price/color/sizes/title)
      let createdCount = 0;
      for (const photo of photos) {
        const photoPrice = Number(photo.price) > 0 ? Number(photo.price) : Number(price);
        const photoColor = (photo.color ?? "").trim() || color || null;
        const photoTitle = (photo.title ?? "").trim() || title;
        const photoSizes: Size[] = (photo.sizes && photo.sizes.length > 0)
          ? photo.sizes
          : (selectedSizes.length > 0 ? selectedSizes : ["M" as Size]);

        const insertPayload: any = {
          shop_id: parsed.data.shop_id,
          title: photoTitle,
          description: parsed.data.description,
          price_gnf: photoPrice,
          category: parsed.data.category,
          detected_color: photoColor,
          created_by: user.id,
          shipping_fee_gnf: Number(shippingFee) || 0,
        };
        const { data: prod, error } = await supabase.from("products").insert(insertPayload).select().single();
        if (error || !prod) { setSubmitting(false); return toast.error(error?.message || "Erreur"); }

        const rows = photoSizes.map((sz, idx) => ({
          product_id: prod.id,
          image_url: photo.url,
          size: sz,
          detected_color: photoColor,
          position: idx,
        }));
        const { error: imgErr } = await supabase.from("product_images").insert(rows);
        if (imgErr) { setSubmitting(false); return toast.error(imgErr.message); }
        createdCount++;
      }
      setSubmitting(false);
      toast.success(`${createdCount} produit(s) publié(s) sur Madina !`);
      nav("/admin/products");
      return;
    }

    // Vendor flow (unchanged behavior)
    const insertPayload: any = {
      shop_id: parsed.data.shop_id,
      title: parsed.data.title,
      description: parsed.data.description,
      price_gnf: parsed.data.price_gnf,
      category: parsed.data.category,
      detected_color: color || null,
      created_by: user.id,
    };
    const { data: prod, error } = await supabase.from("products").insert(insertPayload).select().single();
    if (error || !prod) { setSubmitting(false); return toast.error(error?.message || "Erreur"); }

    const sizesToUse: Size[] = selectedSizes.length > 0 ? selectedSizes : ["M" as Size];
    const rows: any[] = [];
    photos.forEach((p, photoIdx) => {
      sizesToUse.forEach((sz, sizeIdx) => {
        rows.push({
          product_id: prod.id,
          image_url: p.url,
          size: sz,
          detected_color: color || null,
          position: photoIdx * sizesToUse.length + sizeIdx,
        });
      });
    });

    const { error: imgErr } = await supabase.from("product_images").insert(rows);
    setSubmitting(false);
    if (imgErr) return toast.error(imgErr.message);
    toast.success("Produit publié sur Madina !");
    nav("/vendor/products");
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Photos — zone unique avec bouton + */}
      <div className="bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos du produit *
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold">
          {mode === "admin" ? "Ajoutez vos liens d'images" : "Ajoutez vos photos"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "admin"
            ? "Chaque lien d'image devient un produit. Vous pouvez personnaliser le prix, la couleur et les tailles pour chaque image."
            : <>Ajoutez une première photo, puis utilisez le bouton <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary mx-1"><Plus className="h-3 w-3" /></span> pour en ajouter d'autres.</>}
        </p>

        {mode === "admin" && (
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
        )}

        {/* Mode admin : liste détaillée par image */}
        {mode === "admin" && photos.length > 0 && (
          <div className="mt-6 space-y-4">
            {photos.map((p, idx) => {
              const hasPriceOverride = !!(p.price && Number(p.price) > 0);
              const hasColorOverride = !!(p.color && p.color.trim());
              const hasSizesOverride = !!(p.sizes && p.sizes.length > 0);
              const hasTitleOverride = !!(p.title && p.title.trim());
              const overrideCount = [hasPriceOverride, hasColorOverride, hasSizesOverride, hasTitleOverride].filter(Boolean).length;

              const effectivePrice = hasPriceOverride ? Number(p.price) : (Number(price) || 0);
              const effectiveColor = hasColorOverride ? p.color!.trim() : (color || "");
              const effectiveSizes = hasSizesOverride ? p.sizes! : selectedSizes;

              return (
              <div key={p.id} className={`rounded-2xl border bg-background overflow-hidden shadow-soft transition-smooth ${overrideCount > 0 ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                <div className="flex flex-col md:flex-row gap-4 p-4">
                  <div className="relative w-full md:w-40 shrink-0">
                    <div className="aspect-square rounded-xl bg-muted overflow-hidden">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <button
                      onClick={() => removePhoto(p.id)}
                      className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                      aria-label="Supprimer"
                    ><X className="h-4 w-4" /></button>
                    {overrideCount > 0 && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-soft">
                        {overrideCount} spécifique{overrideCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                          Produit #{idx + 1}
                        </p>
                        {overrideCount === 0 && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 px-1.5 py-0.5 rounded bg-muted">
                            100% global
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {overrideCount > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updatePhoto(p.id, { price: "", color: "", sizes: [], title: "" })}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            title="Tout réinitialiser sur les valeurs globales"
                          >
                            <RotateCcw className="h-3 w-3" /> Réinitialiser
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePhoto(p.id, { expanded: !p.expanded })}
                          className="h-7 text-xs"
                        >
                          {p.expanded ? <><ChevronUp className="h-3 w-3" /> Réduire</> : <><ChevronDown className="h-3 w-3" /> Personnaliser</>}
                        </Button>
                      </div>
                    </div>

                    {/* Récap toujours visible — clair sur la source de chaque valeur */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      <ValueChip
                        icon={<Wallet className="h-3 w-3" />}
                        label="Prix"
                        value={effectivePrice > 0 ? `${fmt(effectivePrice)} GNF` : "—"}
                        source={hasPriceOverride ? "override" : (Number(price) > 0 ? "global" : "missing")}
                      />
                      <ValueChip
                        icon={<Palette className="h-3 w-3" />}
                        label="Couleur"
                        value={effectiveColor || "—"}
                        source={hasColorOverride ? "override" : (color ? "global" : "missing")}
                      />
                      <ValueChip
                        icon={<Ruler className="h-3 w-3" />}
                        label="Tailles"
                        value={effectiveSizes.length > 0 ? effectiveSizes.join(", ") : "M"}
                        source={hasSizesOverride ? "override" : (selectedSizes.length > 0 ? "global" : "default")}
                      />
                    </div>

                    {p.expanded && (
                      <div className="space-y-4 mt-2 pt-3 border-t border-dashed border-border">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs flex items-center gap-1.5">
                              <Tag className="h-3 w-3" /> Titre spécifique
                              <SourceBadge source={hasTitleOverride ? "override" : "global"} />
                            </Label>
                            {hasTitleOverride && (
                              <button type="button" onClick={() => updatePhoto(p.id, { title: "" })} className="text-[10px] text-muted-foreground hover:text-destructive">Effacer</button>
                            )}
                          </div>
                          <Input
                            maxLength={120}
                            value={p.title ?? ""}
                            onChange={(e) => updatePhoto(p.id, { title: e.target.value })}
                            placeholder={title ? `Hérite : « ${title} »` : "Définissez d'abord le titre par défaut ci-dessous"}
                            className="h-9"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs flex items-center gap-1.5">
                                <Wallet className="h-3 w-3" /> Prix (GNF)
                                <SourceBadge source={hasPriceOverride ? "override" : (Number(price) > 0 ? "global" : "missing")} />
                              </Label>
                              {hasPriceOverride && (
                                <button type="button" onClick={() => updatePhoto(p.id, { price: "" })} className="text-[10px] text-muted-foreground hover:text-destructive">Effacer</button>
                              )}
                            </div>
                            <Input
                              type="number"
                              min={1}
                              value={p.price ?? ""}
                              onChange={(e) => updatePhoto(p.id, { price: e.target.value })}
                              placeholder={Number(price) > 0 ? `Hérite : ${fmt(Number(price))} GNF` : "Prix obligatoire"}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs flex items-center gap-1.5">
                                <Palette className="h-3 w-3" /> Couleur
                                <SourceBadge source={hasColorOverride ? "override" : (color ? "global" : "missing")} />
                              </Label>
                              {hasColorOverride && (
                                <button type="button" onClick={() => updatePhoto(p.id, { color: "" })} className="text-[10px] text-muted-foreground hover:text-destructive">Effacer</button>
                              )}
                            </div>
                            <ColorPalette value={p.color ?? ""} onChange={(name) => updatePhoto(p.id, { color: name })} size="sm" />
                            <Input
                              maxLength={40}
                              value={p.color ?? ""}
                              onChange={(e) => updatePhoto(p.id, { color: e.target.value })}
                              placeholder={color ? `Hérite : ${color}` : "Ou saisir une couleur..."}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs flex items-center gap-1.5">
                              <Ruler className="h-3 w-3" /> Tailles disponibles
                              <SourceBadge source={hasSizesOverride ? "override" : (selectedSizes.length > 0 ? "global" : "default")} />
                            </Label>
                            {hasSizesOverride && (
                              <button type="button" onClick={() => updatePhoto(p.id, { sizes: [] })} className="text-[10px] text-muted-foreground hover:text-destructive">Effacer</button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {LETTER_SIZES.map((s) => (
                                <SizeChip key={s} label={s} active={(p.sizes ?? []).includes(s)} onClick={() => togglePhotoSize(p.id, s)} small />
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {NUMERIC_SIZES.map((s) => (
                                <SizeChip key={s} label={s} active={(p.sizes ?? []).includes(s)} onClick={() => togglePhotoSize(p.id, s)} small />
                              ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {hasSizesOverride
                                ? "✓ Tailles spécifiques à ce produit."
                                : selectedSizes.length > 0
                                  ? `Hérite des tailles globales : ${selectedSizes.join(", ")}`
                                  : "Aucune taille définie — « M » sera utilisée par défaut."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}

            {/* Légende */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
              <span className="font-semibold uppercase tracking-wider">Légende :</span>
              <SourceBadge source="override" />
              <span>= valeur spécifique à cette image</span>
              <SourceBadge source="global" />
              <span>= héritée des champs globaux ci-dessous</span>
              <SourceBadge source="default" />
              <span>= valeur par défaut</span>
            </div>
          </div>
        )}

        {/* Mode vendor : galerie classique */}
        {mode === "vendor" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-5">
            {photos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-background overflow-hidden shadow-soft">
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
              </div>
            ))}

            <label className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-smooth grid place-items-center cursor-pointer text-center px-3">
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleVendorFiles(e.target.files); e.currentTarget.value = ""; }} />
              {photos.length === 0 ? (
                <div>
                  <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium text-xs">Téléverser une photo</p>
                  <p className="text-[10px] text-muted-foreground mt-1">JPG / PNG · 5 Mo max</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-primary">
                  <span className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium">Ajouter une photo</span>
                </div>
              )}
            </label>
          </div>
        )}

        {photos.length === 0 && mode === "admin" && (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-border bg-muted/30 py-10 grid place-items-center text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucun lien d'image ajouté.</p>
          </div>
        )}

        {/* Tailles & couleur globales */}
        <div className="mt-8 pt-6 border-t border-border space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Tailles {mode === "admin" ? "globales" : "disponibles"} (optionnel)
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {mode === "admin"
                ? "Utilisées pour chaque produit qui n'a pas de tailles spécifiques."
                : "Cochez toutes les tailles où ce produit est disponible."}
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Vêtements</p>
                <div className="flex flex-wrap gap-2">
                  {LETTER_SIZES.map((s) => (
                    <SizeChip key={s} label={s} active={selectedSizes.includes(s)} onClick={() => toggleSize(s)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Pointures</p>
                <div className="flex flex-wrap gap-2">
                  {NUMERIC_SIZES.map((s) => (
                    <SizeChip key={s} label={s} active={selectedSizes.includes(s)} onClick={() => toggleSize(s)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-xl">
            <Label>Couleur {mode === "admin" ? "globale" : ""} (optionnel)</Label>
            <ColorPalette value={color} onChange={setColor} />
            <Input maxLength={40} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ou saisir une couleur personnalisée..." className="h-9" />
          </div>
        </div>
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
            {mode === "admin" && shops.length === 0 && (
              <p className="text-xs text-amber-600">Aucune boutique trouvée.</p>
            )}
            {mode === "vendor" && shops.length === 0 && (
              <p className="text-xs text-amber-600">Aucune boutique validée — l'admin doit valider votre boutique avant que vous ne puissiez publier.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent className="max-h-80">
                {CATEGORY_GROUPS.map((g, gi) => (
                  <div key={g.label}>
                    {gi > 0 && <SelectSeparator />}
                    <SelectGroup>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.items.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.startsWith("Vêtements - ") ? c.replace("Vêtements - ", "  ") : c}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Titre {mode === "admin" ? "par défaut" : ""} *</Label>
            <Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Robe Wax Émeraude" />
          </div>
          <div className="space-y-1.5">
            <Label>Prix {mode === "admin" ? "par défaut" : "de vente"} (GNF) *</Label>
            <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" />
          </div>
          {mode === "admin" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Frais de livraison (GNF)</Label>
              <Input type="number" min={0} value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} placeholder="0" />
              <p className="text-[11px] text-muted-foreground">Visible par le client et ajouté au total à payer.</p>
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Description *</Label>
            <Textarea rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tissu, finition, conseils d'entretien..." />
          </div>
        </div>

        {mode === "vendor" && (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">Validation par Madina</p>
              <p className="text-muted-foreground mt-0.5">Votre produit sera publié dès qu'un administrateur l'aura validé. Les frais de livraison seront définis par Madina.</p>
            </div>
          </div>
        )}

        {/* Aperçu prix net vendeur */}
        {mode === "vendor" && priceNum > 0 && (
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Ce que vous recevrez</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prix de vente</p>
                <p className="font-display font-bold text-lg mt-1">{fmt(priceNum)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission ({commissionRate}%)</p>
                <p className="font-display font-bold text-lg mt-1 text-secondary-foreground/80">- {fmt(commissionAmount)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
              </div>
              <div className="rounded-xl bg-primary/10 px-2 py-1">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Net vendeur</p>
                <p className="font-display font-bold text-lg mt-1 text-primary">{fmt(netAmount)} <span className="text-xs font-medium">GNF</span></p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Montant que Madina vous reversera après chaque vente payée.</p>
          </div>
        )}

        <Button onClick={submit} disabled={submitting} size="lg" className="w-full md:w-auto md:px-10 mt-8 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold hover:opacity-95">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Publication...</> : (mode === "admin" && photos.length > 1 ? `Publier ${photos.length} produits` : "Publier le produit")}
        </Button>
      </div>
    </div>
  );
}

function SizeChip({ label, active, onClick, small = false }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        small ? "h-7 min-w-[2.25rem] px-2 text-xs" : "h-9 min-w-[3rem] px-3 text-sm",
        "rounded-xl border font-medium transition-smooth",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-soft"
          : "bg-background border-border hover:border-primary/40 hover:bg-muted/50"
      ].join(" ")}
    >
      {label}
    </button>
  );
}

type Source = "override" | "global" | "default" | "missing";

function SourceBadge({ source }: { source: Source }) {
  const config: Record<Source, { label: string; className: string }> = {
    override: { label: "Spécifique", className: "bg-primary/15 text-primary border-primary/30" },
    global:   { label: "Global",     className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
    default:  { label: "Défaut",     className: "bg-muted text-muted-foreground border-border" },
    missing:  { label: "Manquant",   className: "bg-destructive/10 text-destructive border-destructive/30" },
  };
  const c = config[source];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${c.className}`}>
      {c.label}
    </span>
  );
}

function ValueChip({ icon, label, value, source }: { icon: React.ReactNode; label: string; value: string; source: Source }) {
  const tone =
    source === "override" ? "border-primary/40 bg-primary/5"
    : source === "missing" ? "border-destructive/30 bg-destructive/5"
    : "border-border bg-muted/40";
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {icon} {label}
        </span>
        <SourceBadge source={source} />
      </div>
      <p className="text-xs font-semibold truncate" title={value}>{value}</p>
    </div>
  );
}

function ColorPalette({ value, onChange, size = "md" }: { value: string; onChange: (name: string) => void; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PRESETS.map((c) => {
        const active = value.trim().toLowerCase() === c.name.toLowerCase();
        const isWhite = c.name === "Blanc";
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(active ? "" : c.name)}
            title={c.name}
            aria-label={c.name}
            aria-pressed={active}
            className={[
              dim,
              "rounded-full border-2 transition-smooth shrink-0",
              active ? "border-primary ring-2 ring-primary/30 scale-110" : isWhite ? "border-border hover:border-primary/40" : "border-transparent hover:border-primary/40",
            ].join(" ")}
            style={{ background: c.swatch }}
          />
        );
      })}
    </div>
  );
}

