import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";

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

export default function Shops() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price_gnf, category, detected_color, shop:shops(name, slug), images:product_images(image_url, size, position)")
        .order("created_at", { ascending: false });
      setProducts((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const currentGroup = FILTER_GROUPS.find((g) => g.label === activeGroup) ?? null;

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    else if (currentGroup) {
      const values = new Set(currentGroup.items.map((i) => i.value));
      result = result.filter((p) => values.has(p.category));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.shop?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, currentGroup, activeCategory, search]);

  function selectGroup(label: string) {
    setActiveGroup((prev) => (prev === label ? null : label));
    setActiveCategory(null);
  }

  function clearAll() {
    setActiveGroup(null);
    setActiveCategory(null);
    setSearch("");
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-hero border-b border-border/40">
        <div className="container py-10 md:py-14">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground">
            Tous les articles
          </h1>
          <p className="text-primary-foreground/70 mt-2 max-w-lg">
            Parcourez l'ensemble du catalogue Madina — trouvez ce qui vous plaît.
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
            className="mt-6 flex gap-2 max-w-xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un article, une boutique…"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-background/90 backdrop-blur border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-soft"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                  aria-label="Effacer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="lg" className="rounded-full px-6 shadow-soft">
              <Search className="h-4 w-4" />
              Rechercher
            </Button>
          </form>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters */}
        <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0">
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

          {currentGroup && currentGroup.items.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x animate-fade-in mt-2">
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

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredProducts.length} article{filteredProducts.length !== 1 ? "s" : ""} trouvé{filteredProducts.length !== 1 ? "s" : ""}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl border border-border">
            <p className="text-muted-foreground">Aucun article ne correspond à votre recherche.</p>
            <Button variant="link" onClick={clearAll} className="mt-2">
              Voir tous les articles
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
