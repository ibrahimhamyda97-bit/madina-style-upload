import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Palette, Tag, ShoppingCart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

const COLOR_NAME_MAP: Record<string, string> = {
  blanc: "#FFFFFF", white: "#FFFFFF",
  noir: "#1a1a1a", black: "#1a1a1a",
  rouge: "#D32F2F", red: "#D32F2F",
  bleu: "#1976D2", blue: "#1976D2",
  vert: "#388E3C", green: "#388E3C",
  jaune: "#FBC02D", yellow: "#FBC02D",
  orange: "#F57C00",
  rose: "#E91E63", pink: "#E91E63",
  violet: "#7B1FA2", purple: "#7B1FA2",
  gris: "#9E9E9E", grey: "#9E9E9E", gray: "#9E9E9E",
  marron: "#795548", brown: "#795548",
  beige: "#D4B896",
  bordeaux: "#800020",
  turquoise: "#00BCD4",
  corail: "#FF7043", coral: "#FF7043",
  kaki: "#827717", khaki: "#827717",
  crème: "#FFFDD0", cream: "#FFFDD0",
  doré: "#FFD700", gold: "#FFD700",
  argenté: "#C0C0C0", silver: "#C0C0C0",
  marine: "#001F3F", navy: "#001F3F",
  saumon: "#FA8072", salmon: "#FA8072",
  lavande: "#B39DDB", lavender: "#B39DDB",
  ivoire: "#FFFFF0", ivory: "#FFFFF0",
  camel: "#C19A6B",
  taupe: "#483C32",
  menthe: "#98FF98", mint: "#98FF98",
  fuchsia: "#FF00FF",
  cyan: "#00BCD4",
  magenta: "#E91E63",
};

function colorNameToHex(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return COLOR_NAME_MAP[key] ?? null;
}

interface Variant {
  id: string;
  name: string | null;
  color: string | null;
  size: string | null;
  sizes: string[] | null;
  price_gnf: number | null;
  position: number;
  images: { image_url: string; position: number }[];
}

export default function ProductDetail() {
  const { id } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [adding, setAdding] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [extractedColors, setExtractedColors] = useState<Record<string, string>>({});

  const extractDominantColor = useCallback((src: string, key: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 16;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        // Sample center region (avoid edges/backgrounds)
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = 4; y < 12; y++) {
          for (let x = 4; x < 12; x++) {
            const i = (y * size + x) * 4;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
          }
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        setExtractedColors((prev) => ({ ...prev, [key]: `rgb(${r},${g},${b})` }));
      } catch {
        // CORS tainted canvas - fallback: use color name from variant data
      }
    };
    img.onerror = () => {};
    img.src = src;
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: prod }, { data: vrows }] = await Promise.all([
        supabase
          .from("products")
          .select("*, shop:shops(name, slug, city), images:product_images(image_url, size, position, detected_color)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("product_variants")
          .select("id, name, color, size, sizes, price_gnf, position, images:product_variant_images(image_url, position)")
          .eq("product_id", id)
          .order("position"),
      ]);
      setProduct(prod);
      const vs = ((vrows as any) ?? []).map((v: any) => ({
        ...v,
        images: [...(v.images ?? [])].sort((a: any, b: any) => a.position - b.position),
      })) as Variant[];
      // Garder uniquement variantes ayant au moins une photo
      const usable = vs.filter((v) => v.images.length > 0);
      setVariants(usable);
      // Par défaut : sélectionner la photo principale (= produit), pas une variante
      setActiveVariantId(null);
      const firstSize = prod?.images?.[0]?.size;
      if (firstSize) setActiveSize(firstSize);
    })();
  }, [id]);

  const activeVariant = useMemo(
    () => variants.find((v) => v.id === activeVariantId) ?? null,
    [variants, activeVariantId]
  );

  // Extract dominant colors from images
  useEffect(() => {
    const mainImg = product?.images?.[0]?.image_url;
    if (mainImg && !extractedColors["main"]) extractDominantColor(mainImg, "main");
    variants.forEach((v) => {
      const img = v.images[0]?.image_url;
      if (img && !extractedColors[v.id]) extractDominantColor(img, v.id);
    });
  }, [product, variants, extractDominantColor]);


  useEffect(() => { setActivePhotoIdx(0); }, [activeVariantId]);

  // Map size -> first product_image (photo principale fallback)
  const imagesBySize = useMemo(() => {
    const map: Record<string, any> = {};
    (product?.images ?? []).forEach((img: any) => { if (!map[img.size]) map[img.size] = img; });
    return map;
  }, [product]);

  const productSizes = useMemo(
    () => Object.keys(imagesBySize).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    [imagesBySize]
  );

  // Tailles disponibles selon la sélection actuelle
  const availableSizes: string[] = useMemo(() => {
    if (activeVariant) {
      const list = (activeVariant.sizes && activeVariant.sizes.length > 0)
        ? activeVariant.sizes
        : (activeVariant.size ? [activeVariant.size] : []);
      return [...list].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    }
    return productSizes;
  }, [activeVariant, productSizes]);

  // Reset taille quand on change de variante
  useEffect(() => {
    if (availableSizes.length === 0) { setActiveSize(null); return; }
    if (!activeSize || !availableSizes.includes(activeSize)) {
      setActiveSize(availableSizes[0]);
    }
  }, [activeVariantId, availableSizes.join(",")]);

  const galleryImages: string[] = activeVariant
    ? activeVariant.images.map((i) => i.image_url)
    : (product?.images ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((img: any) => img.image_url)
        .filter((url: string, i: number, arr: string[]) => arr.indexOf(url) === i);

  const heroImage = galleryImages[activePhotoIdx] ?? galleryImages[0] ?? null;

  const displayedPrice = activeVariant?.price_gnf ?? product?.price_gnf ?? 0;
  const displayedColor = activeVariant?.color ?? product?.detected_color ?? null;

  if (!product) return <div className="container py-20 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="container py-8 md:py-12 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to={product.shop ? `/shop/${product.shop.slug}` : "/shops"}><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>

      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          {/* Carrousel horizontal swipeable : photo principale + variantes */}
          {(() => {
            const slides = [
              {
                id: null as string | null,
                image: product.images?.[0]?.image_url ?? null,
                color: product.detected_color ?? null,
                label: "Modèle principal",
                isMain: true,
              },
              ...variants.slice(0, 5).map((v) => ({
                id: v.id,
                image: v.images[0]?.image_url ?? null,
                color: v.color,
                label: v.name || v.color || "Variante",
                isMain: false,
              })),
            ];
            const activeIdx = Math.max(0, slides.findIndex((s) => s.id === activeVariantId));
            const goTo = (idx: number) => {
              const clamped = Math.max(0, Math.min(slides.length - 1, idx));
              setActiveVariantId(slides[clamped].id);
              const el = scrollerRef.current;
              if (el) el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
            };
            return (
              <div>
                <div className="relative">
                  <div
                    ref={scrollerRef}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (slides[idx] && slides[idx].id !== activeVariantId) {
                        setActiveVariantId(slides[idx].id);
                      }
                    }}
                    className="flex overflow-x-auto snap-x snap-mandatory rounded-3xl shadow-elegant bg-muted"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {slides.map((s, i) => (
                      <div key={(s.id ?? "main") + i} className="snap-start shrink-0 w-full aspect-square relative">
                        {s.image ? (
                          <img src={s.image} alt={s.label} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-card" />
                        )}
                        {s.isMain && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 shadow-soft">
                            <Star className="h-3 w-3" /> Principal
                          </span>
                        )}
                        <span className="absolute bottom-3 right-3 rounded-full bg-background/80 backdrop-blur text-xs font-medium px-2.5 py-1">
                          {i + 1} / {slides.length}
                        </span>
                      </div>
                    ))}
                  </div>

                  {slides.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Précédent"
                        onClick={() => goTo(activeIdx - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-background/80 backdrop-blur shadow-soft hover:bg-background transition-smooth disabled:opacity-30"
                        disabled={activeIdx === 0}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Suivant"
                        onClick={() => goTo(activeIdx + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-background/80 backdrop-blur shadow-soft hover:bg-background transition-smooth disabled:opacity-30"
                        disabled={activeIdx === slides.length - 1}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Pastilles couleur cliquables sous le carrousel */}
                {slides.length > 1 && (
                  <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
                    {slides.map((s, i) => {
                      const active = i === activeIdx;
                      const colorKey = s.id ?? "main";
                      const bg = colorNameToHex(s.color) || extractedColors[colorKey] || s.color || "#e5e7eb";
                      return (
                        <button
                          key={"dot-" + i}
                          type="button"
                          onClick={() => goTo(i)}
                          aria-label={s.label}
                          title={s.label}
                          className={cn(
                            "relative h-7 w-7 rounded-full border-2 transition-smooth",
                            active ? "border-primary scale-110 shadow-soft" : "border-border hover:border-primary/60"
                          )}
                          style={{ backgroundColor: bg }}
                        >
                          {s.isMain && (
                            <Star className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-primary fill-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>


        <div>
          {product.shop && (
            <Link to={`/shop/${product.shop.slug}`} className="text-sm text-muted-foreground uppercase tracking-wider hover:text-primary">
              {product.shop.name}
            </Link>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">{product.title}</h1>
          <p className="font-display text-3xl font-bold text-primary mt-4">
            {Number(displayedPrice).toLocaleString("fr-FR")} <span className="text-base font-medium text-muted-foreground">GNF</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {Number(product.shipping_fee_gnf ?? 0) > 0
              ? <>+ Livraison <strong className="text-foreground">{Number(product.shipping_fee_gnf).toLocaleString("fr-FR")} GNF</strong></>
              : <>Livraison <strong className="text-emerald-600">offerte</strong></>}
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            <Badge variant="secondary" className="rounded-full"><Tag className="h-3 w-3 mr-1" />{product.category}</Badge>
            {displayedColor && <Badge variant="outline" className="rounded-full"><Palette className="h-3 w-3 mr-1" />{displayedColor}</Badge>}
            {product.detected_object_type && <Badge variant="outline" className="rounded-full">{product.detected_object_type}</Badge>}
          </div>


          {/* Tailles : disponibles selon la variante choisie (ou produit principal) */}
          {availableSizes.length > 0 && (
            <div className="mt-8">
              <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">Choisir une taille</h3>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={cn(
                      "h-12 min-w-12 px-4 rounded-xl border-2 font-display font-bold transition-smooth",
                      activeSize === s ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border hover:border-primary/50"
                    )}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div className="mt-8 prose prose-sm max-w-none">
              <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
              <p className="text-foreground/80 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-10">
            <Button
              size="lg"
              disabled={adding || (availableSizes.length > 0 && !activeSize)}
              onClick={async () => {
                if (!user) return nav("/auth");
                if (!product) return;
                const sizeToUse = activeSize || "M";
                setAdding(true);
                await add(product.id, sizeToUse, 1, activeVariant?.id ?? null);
                setAdding(false);
              }}
              className="flex-1 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold hover:opacity-95 h-14"
            >
              <ShoppingCart className="h-5 w-5" /> {adding ? "Ajout..." : "Ajouter au panier"}
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl h-14">
              <Link to="/cart">Voir le panier</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
