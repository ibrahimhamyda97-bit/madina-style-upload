import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ArrowRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import imgVetements from "@/assets/cat-vetements.jpg";
import imgChaussures from "@/assets/cat-chaussures.jpg";
import imgAccessoires from "@/assets/cat-accessoires.jpg";
import imgBeaute from "@/assets/cat-beaute.jpg";
import imgElectronique from "@/assets/cat-electronique.jpg";
import imgMaison from "@/assets/cat-maison.jpg";
import imgEnfants from "@/assets/cat-enfants.jpg";

const CATEGORIES: { label: string; group: string; image: string; tint: string }[] = [
  { label: "Vêtements", group: "Vêtements", image: imgVetements, tint: "from-rose-900/85 via-rose-700/30 to-transparent" },
  { label: "Chaussures", group: "Chaussures", image: imgChaussures, tint: "from-orange-900/85 via-amber-700/30 to-transparent" },
  { label: "Accessoires", group: "Accessoires", image: imgAccessoires, tint: "from-violet-900/85 via-fuchsia-700/30 to-transparent" },
  { label: "Beauté", group: "Beauté", image: imgBeaute, tint: "from-pink-900/85 via-rose-600/30 to-transparent" },
  { label: "Électronique", group: "Électronique", image: imgElectronique, tint: "from-blue-950/85 via-cyan-700/30 to-transparent" },
  { label: "Maison", group: "Maison", image: imgMaison, tint: "from-emerald-900/85 via-teal-700/30 to-transparent" },
  { label: "Enfants", group: "Enfants", image: imgEnfants, tint: "from-amber-800/85 via-yellow-600/30 to-transparent" },
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
              className="group relative overflow-hidden rounded-2xl border border-border h-44 md:h-56 shadow-soft hover:shadow-elegant transition-smooth animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <img
                src={c.image}
                alt={c.label}
                loading="lazy"
                width={768}
                height={768}
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${c.tint}`} />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display font-bold text-lg md:text-xl text-white drop-shadow-lg">{c.label}</p>
                <p className="text-xs text-white/90 inline-flex items-center gap-1 mt-0.5 drop-shadow">
                  Explorer <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
            </Link>
          ))}

          {/* Toutes les catégories */}
          <Link
            to="/shops"
            className="group relative overflow-hidden rounded-2xl h-44 md:h-56 shadow-soft hover:shadow-elegant transition-smooth animate-fade-up bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground"
            style={{ animationDelay: `${CATEGORIES.length * 60}ms` }}
          >
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-secondary/30 blur-2xl" />
            <div className="relative h-full p-5 flex flex-col justify-between">
              <LayoutGrid className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold text-lg md:text-xl">Toutes les catégories</p>
                <p className="text-xs opacity-90 inline-flex items-center gap-1 mt-0.5">
                  Voir tous les articles <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
