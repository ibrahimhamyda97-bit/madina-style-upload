import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Palette, Tag, ShoppingCart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

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

  // Reset photo index when variant changes
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
          <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-elegant relative">
            {heroImage ? (
              <img key={heroImage} src={heroImage} alt={product.title} className="h-full w-full object-cover animate-fade-in" />
            ) : (
              <div className="h-full w-full bg-gradient-card" />
            )}
          </div>

          {/* Galerie photos de la variante (ou fallback tailles) */}
          {galleryImages.length > 1 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {galleryImages.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActivePhotoIdx(i)}
                  className={cn(
                    "h-16 w-16 rounded-xl overflow-hidden border-2 relative transition-smooth shrink-0",
                    activePhotoIdx === i ? "border-primary shadow-soft" : "border-transparent hover:border-border"
                  )}
                >
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 h-4 w-4 grid place-items-center rounded-full bg-primary text-primary-foreground">
                      <Star className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : null}
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

          {/* Sélecteur : Photo principale + variantes */}
          {variants.length > 0 && (
            <div className="mt-8">
              <div className="flex items-end justify-between gap-3 mb-3">
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                  Choisir votre modèle
                </h3>
                <span className="text-xs text-muted-foreground">Glissez droite / gauche</span>
              </div>
              <div className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-1 pb-3">
                {/* Carte "Photo principale" (= produit de base) */}
                <button
                  onClick={() => setActiveVariantId(null)}
                  className={cn(
                    "snap-start shrink-0 w-32 rounded-2xl border-2 bg-card p-2 transition-smooth text-left",
                    activeVariantId === null ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                    <img
                      src={(product.images?.[0]?.image_url) ?? ""}
                      alt="Modèle principal"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute top-2 left-2 h-6 w-6 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
                      <Star className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="mt-2 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate">Principal</p>
                    <p className="text-[11px] text-primary font-bold mt-0.5">
                      {Number(product.price_gnf).toLocaleString("fr-FR")} GNF
                    </p>
                  </div>
                </button>

                {variants.map((v) => {
                  const active = v.id === activeVariantId;
                  const sizeLabel = (v.sizes && v.sizes.length > 0)
                    ? v.sizes.join("/")
                    : (v.size ?? "");
                  const label = [v.name, v.color, sizeLabel].filter(Boolean).join(" · ") || "Variante";
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveVariantId(v.id)}
                      className={cn(
                        "snap-start shrink-0 w-32 rounded-2xl border-2 bg-card p-2 transition-smooth text-left",
                        active ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                        <img
                          src={v.images[0]?.image_url}
                          alt={label}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="mt-2 min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate">{label}</p>
                        {v.price_gnf != null && (
                          <p className="text-[11px] text-primary font-bold mt-0.5">
                            {Number(v.price_gnf).toLocaleString("fr-FR")} GNF
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
