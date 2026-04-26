import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Palette, Tag, ShoppingCart, Star } from "lucide-react";
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
          .select("id, name, color, size, price_gnf, position, images:product_variant_images(image_url, position)")
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
      if (usable.length > 0) {
        setActiveVariantId(usable[0].id);
        setActiveSize(usable[0].size);
      } else {
        const firstSize = prod?.images?.[0]?.size;
        if (firstSize) setActiveSize(firstSize);
      }
    })();
  }, [id]);

  const activeVariant = useMemo(
    () => variants.find((v) => v.id === activeVariantId) ?? null,
    [variants, activeVariantId]
  );

  // Reset photo index when variant changes
  useEffect(() => { setActivePhotoIdx(0); }, [activeVariantId]);

  // Map size -> first product_image (legacy fallback)
  const imagesBySize = useMemo(() => {
    const map: Record<string, any> = {};
    (product?.images ?? []).forEach((img: any) => { if (!map[img.size]) map[img.size] = img; });
    return map;
  }, [product]);

  const availableSizes = useMemo(
    () => Object.keys(imagesBySize).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    [imagesBySize]
  );

  const galleryImages: string[] = activeVariant
    ? activeVariant.images.map((i) => i.image_url)
    : (activeSize && imagesBySize[activeSize] ? [imagesBySize[activeSize].image_url] : []);

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
          ) : variants.length === 0 && availableSizes.length > 1 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {availableSizes.map((s) => {
                const img = imagesBySize[s];
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={cn(
                      "h-16 w-16 rounded-xl overflow-hidden border-2 relative transition-smooth shrink-0",
                      activeSize === s ? "border-primary shadow-soft" : "border-transparent hover:border-border"
                    )}
                  >
                    <img src={img.image_url} alt={`Taille ${s}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-background/85 text-[10px] font-bold text-center py-0.5">{s}</span>
                  </button>
                );
              })}
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

          {/* Sélecteur de variantes */}
          {variants.length > 0 && (
            <div className="mt-8">
              <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Choisir une variante ({variants.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const active = v.id === activeVariantId;
                  const label = [v.name, v.color, v.size].filter(Boolean).join(" · ") || "Variante";
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setActiveVariantId(v.id); setActiveSize(v.size); }}
                      className={cn(
                        "rounded-2xl border-2 px-3 py-2 transition-smooth flex items-center gap-2",
                        active ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/50"
                      )}
                    >
                      <img
                        src={v.images[0]?.image_url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover bg-muted"
                      />
                      <div className="text-left">
                        <p className="text-xs font-semibold leading-tight">{label}</p>
                        {v.price_gnf != null && v.price_gnf !== product.price_gnf && (
                          <p className="text-[11px] text-primary font-bold">
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

          {/* Tailles : seulement si pas de variantes (legacy) */}
          {variants.length === 0 && availableSizes.length > 0 && (
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
              disabled={adding || (variants.length === 0 && !activeSize)}
              onClick={async () => {
                if (!user) return nav("/auth");
                if (!product) return;
                // Use variant size if available; else activeSize; else default 'M'
                const sizeToUse = activeVariant?.size || activeSize || "M";
                setAdding(true);
                await add(product.id, sizeToUse, 1, activeVariant?.id);
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
