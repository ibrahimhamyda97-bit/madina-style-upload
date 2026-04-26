import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, Store, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import hero from "@/assets/hero-madina.jpg";

export default function Home() {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price_gnf, category, detected_color, shop:shops(name, slug), images:product_images(image_url, size, position)")
        .order("created_at", { ascending: false })
        .limit(8);
      setProducts((data ?? []) as any);
    })();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute -bottom-px left-0 right-0 h-1 bg-gradient-flag" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium mb-6 animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-secondary" /> La marketplace premium de Guinée
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-balance animate-fade-up">
              Le marché de <span className="text-secondary">Madina</span><br/>dans votre poche.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-xl animate-fade-up" style={{ animationDelay: "120ms" }}>
              Découvrez des boutiques locales authentiques. Choisissez votre taille, votre couleur — et recevez exactement ce que vous voyez.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
              <Button asChild size="lg" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-gold">
                <Link to="/shops">Explorer les boutiques <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-white/5 backdrop-blur border-white/30 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
                <Link to="/onboarding/shop"><Store className="h-4 w-4" /> Ouvrir ma boutique</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="container py-14 grid md:grid-cols-3 gap-6">
        {[
          { icon: Sparkles, title: "Détection IA", desc: "Couleur et type d'objet détectés automatiquement à partir de vos photos." },
          { icon: ShieldCheck, title: "Boutiques vérifiées", desc: "Des vendeurs guinéens locaux, sélectionnés et fiables." },
          { icon: Store, title: "5 photos par taille", desc: "Une image dédiée à chaque taille XS, S, M, L, XL — zéro surprise." },
        ].map((f, i) => (
          <div key={i} className="bg-gradient-card border border-border rounded-3xl p-6 shadow-soft hover:shadow-elegant transition-smooth animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center text-primary mb-4">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* PRODUCTS */}
      <section className="container py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Nouveautés</h2>
            <p className="text-muted-foreground mt-1">Les derniers produits ajoutés par nos boutiques.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/shops">Voir tout <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        {products.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
