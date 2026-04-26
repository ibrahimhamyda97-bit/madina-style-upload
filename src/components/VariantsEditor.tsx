import { useState } from "react";
import { Plus, X, Loader2, Upload, Wallet, Palette, Ruler, Tag, Image as ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LETTER_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const NUMERIC_SIZES = ["36","37","38","39","40","41","42","43","44","45"] as const;
const ALL_SIZES = [...LETTER_SIZES, ...NUMERIC_SIZES] as const;
export type Size = typeof ALL_SIZES[number];

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
  { name: "Bleu ciel", swatch: "#38bdf8" },
  { name: "Bleu", swatch: "#2563eb" },
  { name: "Bleu marine", swatch: "#1e3a8a" },
  { name: "Violet", swatch: "#7c3aed" },
  { name: "Doré", swatch: "#d4af37" },
  { name: "Argenté", swatch: "#c0c0c0" },
  { name: "Multicolore", swatch: "linear-gradient(135deg,#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6)" },
];

export interface DraftVariantImage {
  id: string;
  url: string;
  loading: boolean;
}

export interface DraftVariant {
  id: string;
  name: string;
  color: string;
  sizes: Size[]; // plusieurs tailles possibles
  price: string; // PRIX OBLIGATOIRE (chaque variante a son propre prix)
  images: DraftVariantImage[]; // index 0 = principale, 1..4 = secondaires
}

export function makeEmptyVariant(): DraftVariant {
  return { id: crypto.randomUUID(), name: "", color: "", sizes: [], price: "", images: [] };
}

interface Props {
  variants: DraftVariant[];
  onChange: (v: DraftVariant[]) => void;
  /** Mode "vendor" upload to bucket; mode "admin" allows URL input. */
  mode: "vendor" | "admin";
  /** User id used for vendor uploads */
  userId?: string;
}

export default function VariantsEditor({ variants, onChange, mode, userId }: Props) {
  function update(id: string, patch: Partial<DraftVariant>) {
    onChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  function remove(id: string) {
    onChange(variants.filter((v) => v.id !== id));
  }
  function add() {
    onChange([...variants, makeEmptyVariant()]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Variantes (optionnel)
          </Label>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Chaque variante a son <strong className="text-foreground">propre prix</strong>, sa couleur, ses <strong className="text-foreground">tailles</strong> et jusqu'à <strong className="text-foreground">5 photos</strong> (1 principale + 4 secondaires).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="rounded-xl">
          <Plus className="h-4 w-4" /> Ajouter une variante
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 py-8 grid place-items-center text-center">
          <ImageIcon className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Aucune variante. Cliquez sur « Ajouter une variante ».</p>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((v, idx) => (
            <VariantCard
              key={v.id}
              index={idx}
              variant={v}
              onUpdate={(patch) => update(v.id, patch)}
              onRemove={() => remove(v.id)}
              mode={mode}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantCard({
  index, variant, onUpdate, onRemove, mode, userId,
}: {
  index: number;
  variant: DraftVariant;
  onUpdate: (patch: Partial<DraftVariant>) => void;
  onRemove: () => void;
  mode: "vendor" | "admin";
  userId?: string;
}) {
  const [adminUrl, setAdminUrl] = useState("");
  const max = 5;
  const principal = variant.images[0];
  const secondaries = variant.images.slice(1, 5);
  const slotsLeft = max - variant.images.length;

  async function handleFiles(files: FileList | null) {
    if (!files || !userId) return;
    for (const file of Array.from(files)) {
      if (variant.images.length >= max) break;
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: trop lourd (5 Mo max)`); continue; }
      const id = crypto.randomUUID();
      const draft: DraftVariantImage = { id, url: "", loading: true };
      onUpdate({ images: [...variant.images, draft] });
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${id}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(error.message);
        onUpdate({ images: variant.images.filter((i) => i.id !== id) });
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      onUpdate({
        images: [...variant.images.filter((i) => i.id !== id), { id, url: pub.publicUrl, loading: false }],
      });
    }
  }

  function addUrl() {
    const url = adminUrl.trim();
    if (!url) return toast.error("Saisissez une URL");
    try { new URL(url); } catch { return toast.error("URL invalide"); }
    if (variant.images.length >= max) return toast.error("Maximum 5 photos par variante");
    onUpdate({ images: [...variant.images, { id: crypto.randomUUID(), url, loading: false }] });
    setAdminUrl("");
  }

  function removeImage(id: string) {
    onUpdate({ images: variant.images.filter((i) => i.id !== id) });
  }

  function makePrincipal(id: string) {
    const target = variant.images.find((i) => i.id === id);
    if (!target) return;
    const others = variant.images.filter((i) => i.id !== id);
    onUpdate({ images: [target, ...others] });
  }

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-soft">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 grid place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <p className="font-medium text-sm truncate">
            {variant.name || variant.color || (variant.sizes.length ? variant.sizes.join("/") : `Variante ${index + 1}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 grid place-items-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
          aria-label="Supprimer la variante"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Photos */}
        <div>
          <Label className="text-xs flex items-center gap-1.5 mb-2">
            <ImageIcon className="h-3 w-3" /> Photos ({variant.images.length}/{max})
          </Label>

          {mode === "admin" && (
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <Input
                value={adminUrl}
                onChange={(e) => setAdminUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                placeholder="https://exemple.com/image.jpg"
                className="h-9"
                disabled={slotsLeft <= 0}
              />
              <Button type="button" onClick={addUrl} size="sm" className="h-9" disabled={slotsLeft <= 0}>
                <Plus className="h-4 w-4" /> Ajouter URL
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* Principal slot */}
            <ImageSlot
              image={principal}
              isPrincipal
              onRemove={principal ? () => removeImage(principal.id) : undefined}
            />
            {/* Secondary slots */}
            {Array.from({ length: 4 }).map((_, i) => {
              const img = secondaries[i];
              return (
                <ImageSlot
                  key={i}
                  image={img}
                  onRemove={img ? () => removeImage(img.id) : undefined}
                  onMakePrincipal={img ? () => makePrincipal(img.id) : undefined}
                />
              );
            })}
          </div>

          {mode === "vendor" && slotsLeft > 0 && (
            <label className="mt-3 inline-flex items-center gap-2 text-xs text-primary cursor-pointer hover:underline">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }}
              />
              <Upload className="h-3.5 w-3.5" />
              Téléverser {slotsLeft} photo{slotsLeft > 1 ? "s" : ""} (5 Mo max)
            </label>
          )}
        </div>

        {/* Champs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Tag className="h-3 w-3" /> Nom (optionnel)</Label>
            <Input
              maxLength={60}
              value={variant.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Ex. Édition limitée"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Prix (GNF) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              required
              value={variant.price}
              onChange={(e) => onUpdate({ price: e.target.value })}
              placeholder="Ex. 150000"
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Palette className="h-3 w-3" /> Couleur (optionnel)</Label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => {
              const active = variant.color.trim().toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onUpdate({ color: active ? "" : c.name })}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={active}
                  className={[
                    "h-6 w-6 rounded-full border-2 transition-smooth shrink-0",
                    active ? "border-primary ring-2 ring-primary/30 scale-110" : c.name === "Blanc" ? "border-border" : "border-transparent hover:border-primary/40",
                  ].join(" ")}
                  style={{ background: c.swatch }}
                />
              );
            })}
          </div>
          <Input
            maxLength={40}
            value={variant.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            placeholder="Ou saisir une couleur..."
            className="h-9 mt-1.5"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Ruler className="h-3 w-3" /> Tailles disponibles (cochez plusieurs)
          </Label>
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {LETTER_SIZES.map((s) => {
                const active = variant.sizes.includes(s);
                return (
                  <SizeBtn
                    key={s}
                    label={s}
                    active={active}
                    onClick={() => onUpdate({ sizes: active ? variant.sizes.filter((x) => x !== s) : [...variant.sizes, s] })}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NUMERIC_SIZES.map((s) => {
                const active = variant.sizes.includes(s);
                return (
                  <SizeBtn
                    key={s}
                    label={s}
                    active={active}
                    onClick={() => onUpdate({ sizes: active ? variant.sizes.filter((x) => x !== s) : [...variant.sizes, s] })}
                  />
                );
              })}
            </div>
            {variant.sizes.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Aucune taille — la variante sera proposée sans choix de taille.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageSlot({
  image, isPrincipal, onRemove, onMakePrincipal,
}: {
  image?: DraftVariantImage;
  isPrincipal?: boolean;
  onRemove?: () => void;
  onMakePrincipal?: () => void;
}) {
  return (
    <div className={`relative aspect-square rounded-xl border-2 overflow-hidden ${isPrincipal ? "border-primary" : "border-dashed border-border"}`}>
      {image ? (
        image.loading ? (
          <div className="h-full w-full grid place-items-center bg-muted">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <img src={image.url} alt="" className="h-full w-full object-cover" />
            {isPrincipal && (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider shadow-soft">
                <Star className="h-2.5 w-2.5" /> Principale
              </span>
            )}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              {onMakePrincipal && (
                <button
                  type="button"
                  onClick={onMakePrincipal}
                  title="Définir comme principale"
                  className="h-6 w-6 grid place-items-center rounded-full bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground transition-smooth"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  title="Retirer"
                  className="h-6 w-6 grid place-items-center rounded-full bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </>
        )
      ) : (
        <div className="h-full w-full grid place-items-center text-muted-foreground bg-muted/20 text-center px-1.5">
          {isPrincipal ? (
            <div>
              <Star className="h-4 w-4 mx-auto mb-1 text-primary/60" />
              <p className="text-[10px] font-semibold">Principale</p>
            </div>
          ) : (
            <p className="text-[10px]">Secondaire</p>
          )}
        </div>
      )}
    </div>
  );
}

function SizeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-7 min-w-[2.25rem] px-2 text-xs rounded-xl border font-medium transition-smooth",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-soft"
          : "bg-background border-border hover:border-primary/40 hover:bg-muted/50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/** Persist drafted variants to DB for a given product. Returns number of variants created. */
export async function persistVariants(productId: string, variants: DraftVariant[]): Promise<number> {
  let created = 0;
  for (let idx = 0; idx < variants.length; idx++) {
    const v = variants[idx];
    const validImages = v.images.filter((i) => !i.loading && i.url);
    if (validImages.length === 0) continue; // skip variantes sans photos
    const priceNum = Number(v.price);
    if (!(priceNum > 0)) { toast.error(`Variante ${idx + 1}: prix obligatoire`); continue; }
    const { data: vrow, error: verr } = await supabase
      .from("product_variants")
      .insert({
        product_id: productId,
        name: v.name.trim() || null,
        color: v.color.trim() || null,
        size: v.sizes[0] ?? null, // legacy compat
        sizes: v.sizes.length > 0 ? (v.sizes as any) : [],
        price_gnf: priceNum,
        position: idx,
      })
      .select()
      .single();
    if (verr || !vrow) { toast.error(`Variante ${idx + 1}: ${verr?.message || "erreur"}`); continue; }
    const rows = validImages.map((img, p) => ({ variant_id: vrow.id, image_url: img.url, position: p }));
    const { error: imgErr } = await supabase.from("product_variant_images").insert(rows);
    if (imgErr) { toast.error(`Photos variante ${idx + 1}: ${imgErr.message}`); continue; }
    created++;
  }
  return created;
}
