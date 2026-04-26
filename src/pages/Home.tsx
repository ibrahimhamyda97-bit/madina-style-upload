import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, Store, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import hero from "@/assets/hero-madina.jpg";

// Groupes de catégories (alignés avec le formulaire d'ajout d'article).
// Chaque entrée "items" liste les valeurs exactes stockées en base.
const FILTER_GROUPS: { label: string; items: { label: string; value: string }[] }[] = [
  {
    label: "Vêtements",
    items: [
      { label: "Robes", value: "Vêtements - Robes" },
      { label: "Vestes", value: "Vêtements - Vestes" },
      { label: "Blazers", value: "Vêtements - Blazers" },
      { label: "Pantalons", value: "Vêtements - Pantalons" },
      { label: "Jeans", value: "Vêtements - Jeans" },
      { label: "Chemises", value: "Vêtements - Chemises" },
      { label: "T-shirts", value: "Vêtements - T-shirts" },
      { label: "Pulls & Sweats", value: "Vêtements - Pulls & Sweats" },
      { label: "Jupes", value: "Vêtements - Jupes" },
      { label: "Shorts", value: "Vêtements - Shorts" },
      { label: "Manteaux", value: "Vêtements - Manteaux" },
      { label: "Sous-vêtements", value: "Vêtements - Sous-vêtements" },
      { label: "Tenues traditionnelles", value: "Vêtements - Tenues traditionnelles" },
      { label: "Autre", value: "Vêtements - Autre" },
    ],
  },
  { label: "Chaussures", items: [{ label: "Toutes", value: "Chaussures" }] },
  {
    label: "Accessoires",
    items: [
      { label: "Accessoires", value: "Accessoires" },
      { label: "Sacs", value: "Sacs" },
      { label: "Bijoux", value: "Bijoux" },
    ],
  },
  { label: "Beauté", items: [{ label: "Toutes", value: "Beauté" }] },
  {
    label: "Électronique",
    items: [
      { label: "Téléphones", value: "Téléphones" },
      { label: "Ordinateurs", value: "Ordinateurs" },
      { label: "Tablettes", value: "Tablettes" },
      { label: "Accessoires Tech", value: "Accessoires Tech" },
    ],
  },
  { label: "Maison", items: [{ label: "Toutes", value: "Maison" }] },
  { label: "Enfants", items: [{ label: "Toutes", value: "Enfants" }] },
];

export default function Home() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price_gnf, category, detected_color, shop:shops(name, slug), images:product_images(image_url, size, position)")
        .order("created_at", { ascending: false })
        .limit(24);
      setProducts((data ?? []) as any);
    })();
  }, []);

  const currentGroup = FILTER_GROUPS.find((g) => g.label === activeGroup) ?? null;

  const filteredProducts = useMemo(() => {
    if (activeCategory) return products.filter((p) => p.category === activeCategory);
    if (currentGroup) {
      const values = new Set(currentGroup.items.map((i) => i.value));
      return products.filter((p) => values.has(p.category));
    }
    return products;
  }, [products, currentGroup, activeCategory]);

  function selectGroup(label: string) {
    setActiveGroup((prev) => (prev === label ? null : label));
    setActiveCategory(null);
  }

  function clearAll() {
    setActiveGroup(null);
    setActiveCategory(null);
  }

  return (
    <div className="animate-fade-in">
      {/* HERO — split layout, image visible et nette */}
      <section className="relative overflow-hidden bg-gradient-hero">
        {/* Halos colorés pour un fond moderne et vibrant */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-px left-0 right-0 h-1.5 bg-gradient-flag" />

        <div className="container relative py-16 md:py-24 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Colonne texte */}
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium mb-6 animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-secondary" /> La marketplace premium de Guinée
            </span>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance animate-fade-up">
              Le marché de <span className="text-secondary">Madina</span><br/>dans votre poche.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-xl animate-fade-up" style={{ animationDelay: "120ms" }}>
              Découvrez des boutiques locales authentiques. Choisissez votre taille, votre couleur — et recevez exactement ce que vous voyez.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "240ms" }}>
              <Button asChild size="lg" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-gold">
                <Link to="/shops">Explorer les boutiques <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-white/10 backdrop-blur border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
                <Link to="/onboarding/shop"><Store className="h-4 w-4" /> Ouvrir ma boutique</Link>
              </Button>
            </div>
          </div>

          {/* Colonne image — nette, vibrante, encadrée */}
          <div className="relative animate-fade-up" style={{ animationDelay: "180ms" }}>
            <div className="absolute -inset-4 bg-gradient-flag rounded-[2rem] blur-2xl opacity-40" />
            <div className="relative rounded-[2rem] overflow-hidden border border-white/20 shadow-elegant ring-1 ring-white/10">
              <img
                src={hero}
                alt="Mode et artisanat de Guinée — marketplace Madina"
                width={1600}
                height={1024}
                className="w-full h-[420px] md:h-[520px] object-cover"
              />
              {/* Badge flottant */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 bg-background/85 backdrop-blur-md rounded-2xl px-4 py-3 shadow-soft border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Tendance cette semaine</p>
                  <p className="text-sm font-semibold text-foreground">Bazin & tenues traditionnelles</p>
                </div>
                <span className="inline-flex h-9 px-3 items-center rounded-full bg-gradient-gold text-secondary-foreground text-xs font-bold shadow-gold">
                  Nouveau
                </span>
              </div>
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
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Nouveautés</h2>
            <p className="text-muted-foreground mt-1">Les derniers produits ajoutés par nos boutiques.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/shops">Voir tout <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Filtre mobile-first : groupes parents (scroll horizontal) */}
        <div className="mb-3 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtrer par catégorie
            {(activeGroup || activeCategory) && (
              <button onClick={clearAll} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                <X className="h-3 w-3" /> Réinitialiser
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-thin">
            <button
              onClick={clearAll}
              className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium border transition-smooth ${
                !activeGroup
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              Tout
            </button>
            {FILTER_GROUPS.map((g) => (
              <button
                key={g.label}
                onClick={() => selectGroup(g.label)}
                className={`shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium border transition-smooth ${
                  activeGroup === g.label
                    ? "bg-primary text-primary-foreground border-primary shadow-soft"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Sous-catégories (apparaissent quand un groupe est sélectionné) */}
          {currentGroup && currentGroup.items.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x animate-fade-in">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth ${
                  !activeCategory
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Tous {currentGroup.label.toLowerCase()}
              </button>
              {currentGroup.items.map((it) => (
                <button
                  key={it.value}
                  onClick={() => setActiveCategory((prev) => (prev === it.value ? null : it.value))}
                  className={`shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth ${
                    activeCategory === it.value
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl border border-border">
            <p className="text-muted-foreground">Aucun produit dans cette catégorie pour le moment.</p>
            <Button variant="link" onClick={clearAll} className="mt-2">Voir tous les produits</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
