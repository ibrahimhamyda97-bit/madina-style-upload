import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardData } from "@/components/ProductCard";

export default function ShopDetail() {
  const { slug } = useParams();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("shops").select("id, name, slug, description, logo_url, banner_url, city, phone, status").eq("slug", slug).maybeSingle();
      setShop(s);
      if (s) {
        const { data: p } = await supabase
          .from("products")
          .select("id, title, price_gnf, category, detected_color, shop:shops(name, slug), images:product_images(image_url, size, position)")
          .eq("shop_id", s.id)
          .order("created_at", { ascending: false });
        setProducts((p ?? []) as any);
      }
    })();
  }, [slug]);

  if (!shop) return <div className="container py-20 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="animate-fade-in">
      <div className="aspect-[16/5] md:aspect-[16/4] relative overflow-hidden bg-gradient-flag">
        {shop.banner_url && <img src={shop.banner_url} alt={shop.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>
      <div className="container -mt-16 relative">
        <div className="flex flex-col md:flex-row md:items-end gap-5">
          <div className="h-28 w-28 rounded-3xl bg-card border-4 border-background shadow-elegant overflow-hidden shrink-0">
            {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-gold" />}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{shop.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1.5">
              {shop.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{shop.city}</span>}
              {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{shop.phone}</span>}
            </div>
            {shop.description && <p className="text-muted-foreground mt-3 max-w-2xl">{shop.description}</p>}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold mb-6">Produits</h2>
          {products.length === 0 ? (
            <p className="text-muted-foreground">Aucun produit pour l'instant.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
