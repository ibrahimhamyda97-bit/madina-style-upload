import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Palette, Tag, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

export default function ProductDetail() {
  const { id } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, shop:shops(name, slug, city), images:product_images(image_url, size, position, detected_color)")
        .eq("id", id)
        .maybeSingle();
      setProduct(data);
      const firstSize = data?.images?.[0]?.size;
      if (firstSize) setActiveSize(firstSize);
    })();
  }, [id]);

  const imagesBySize = useMemo(() => {
    const map: Record<string, any> = {};
    (product?.images ?? []).forEach((img: any) => { map[img.size] = img; });
    return map;
  }, [product]);

  const availableSizes = useMemo(
    () => Object.keys(imagesBySize).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    [imagesBySize]
  );
  const activeImage = activeSize ? imagesBySize[activeSize] : null;

  if (!product) return <div className="container py-20 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="container py-8 md:py-12 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to={product.shop ? `/shop/${product.shop.slug}` : "/shops"}><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>

      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-elegant relative">
            {activeImage ? (
              <img key={activeImage.image_url} src={activeImage.image_url} alt={product.title} className="h-full w-full object-cover animate-fade-in" />
            ) : (
              <div className="h-full w-full bg-gradient-card" />
            )}
          </div>
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
        </div>

        <div>
          {product.shop && (
            <Link to={`/shop/${product.shop.slug}`} className="text-sm text-muted-foreground uppercase tracking-wider hover:text-primary">
              {product.shop.name}
            </Link>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">{product.title}</h1>
          <p className="font-display text-3xl font-bold text-primary mt-4">
            {Number(product.price_gnf).toLocaleString("fr-FR")} <span className="text-base font-medium text-muted-foreground">GNF</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {Number(product.shipping_fee_gnf ?? 0) > 0
              ? <>+ Livraison <strong className="text-foreground">{Number(product.shipping_fee_gnf).toLocaleString("fr-FR")} GNF</strong></>
              : <>Livraison <strong className="text-emerald-600">offerte</strong></>}
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            <Badge variant="secondary" className="rounded-full"><Tag className="h-3 w-3 mr-1" />{product.category}</Badge>
            {product.detected_color && <Badge variant="outline" className="rounded-full"><Palette className="h-3 w-3 mr-1" />{product.detected_color}</Badge>}
            {product.detected_object_type && <Badge variant="outline" className="rounded-full">{product.detected_object_type}</Badge>}
          </div>

          <div className="mt-8">
            <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-3">Choisir une taille</h3>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((s) => {
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={cn(
                      "h-12 min-w-12 px-4 rounded-xl border-2 font-display font-bold transition-smooth",
                      activeSize === s ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border hover:border-primary/50"
                    )}
                  >{s}</button>
                );
              })}
            </div>
            {activeImage?.detected_color && (
              <p className="text-xs text-muted-foreground mt-3">Couleur de cette taille : <strong className="text-foreground">{activeImage.detected_color}</strong></p>
            )}
          </div>

          {product.description && (
            <div className="mt-8 prose prose-sm max-w-none">
              <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-2">Description</h3>
              <p className="text-foreground/80 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mt-10">
            <Button
              size="lg"
              disabled={!activeSize || adding}
              onClick={async () => {
                if (!user) return nav("/auth");
                if (!activeSize || !product) return;
                setAdding(true);
                await add(product.id, activeSize);
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
