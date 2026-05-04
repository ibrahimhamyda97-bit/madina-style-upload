import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ArrowRight, Shirt, Footprints, Watch, Sparkles, Smartphone, Home as HomeIcon, Baby, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES: { label: string; group: string; icon: any; gradient: string }[] = [
  { label: "Vêtements", group: "Vêtements", icon: Shirt, gradient: "from-rose-500/20 to-pink-500/10" },
  { label: "Chaussures", group: "Chaussures", icon: Footprints, gradient: "from-amber-500/20 to-orange-500/10" },
  { label: "Accessoires", group: "Accessoires", icon: Watch, gradient: "from-violet-500/20 to-fuchsia-500/10" },
  { label: "Beauté", group: "Beauté", icon: Sparkles, gradient: "from-pink-500/20 to-rose-500/10" },
  { label: "Électronique", group: "Électronique", icon: Smartphone, gradient: "from-blue-500/20 to-cyan-500/10" },
  { label: "Maison", group: "Maison", icon: HomeIcon, gradient: "from-emerald-500/20 to-teal-500/10" },
  { label: "Enfants", group: "Enfants", icon: Baby, gradient: "from-yellow-500/20 to-amber-500/10" },
];

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    nav(term ? `/shops?q=${encodeURIComponent(term)}` : "/shops");
  }

  return (
    <div className="animate-fade-in">
      {/* HERO compact avec recherche */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-px left-0 right-0 h-1.5 bg-gradient-flag" />

        <div className="relative container py-14 md:py-20 text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-secondary">Madina</span> — Votre marketplace
          </h1>
          <p className="mt-4 text-primary-foreground/85 max-w-xl mx-auto">
            Parcourez par catégorie ou recherchez un article en un clic.
          </p>

          <form onSubmit={submitSearch} className="mt-8 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un article…"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-background/95 backdrop-blur border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-soft"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-gold">
              <Search className="h-4 w-4" /> Rechercher
            </Button>
          </form>
        </div>
      </section>

      {/* Grille des collections */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Nos collections</h2>
            <p className="text-muted-foreground text-sm mt-1">Choisissez une catégorie pour explorer.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/shops">Toutes les catégories <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.label}
              to={`/shops?group=${encodeURIComponent(c.group)}`}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${c.gradient} p-5 h-32 md:h-36 flex flex-col justify-between shadow-soft hover:shadow-elegant transition-smooth animate-fade-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <c.icon className="h-7 w-7 text-foreground/80 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold text-base md:text-lg text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  Explorer <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
            </Link>
          ))}

          {/* Toutes les catégories */}
          <Link
            to="/shops"
            className="group relative overflow-hidden rounded-2xl border-2 border-primary bg-primary text-primary-foreground p-5 h-32 md:h-36 flex flex-col justify-between shadow-soft hover:shadow-elegant transition-smooth animate-fade-up"
            style={{ animationDelay: `${CATEGORIES.length * 60}ms` }}
          >
            <LayoutGrid className="h-7 w-7 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-display font-bold text-base md:text-lg">Toutes les catégories</p>
              <p className="text-xs opacity-90 inline-flex items-center gap-1">
                Voir tous les articles <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
