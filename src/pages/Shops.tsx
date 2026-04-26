import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
}

export default function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("shops").select("id,name,slug,description,logo_url,banner_url,city").order("created_at", { ascending: false }).then(({ data }) => {
      setShops((data ?? []) as Shop[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container py-10 animate-fade-in">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Boutiques</h1>
        <p className="text-muted-foreground mt-2">Explorez les boutiques locales de Madina.</p>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[4/3] rounded-3xl bg-muted animate-pulse" />)}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl">
          <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune boutique pour l'instant.</p>
          <Link to="/onboarding/shop" className="text-primary font-medium underline-offset-4 hover:underline mt-2 inline-block">Soyez la première !</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((s, i) => (
            <Link key={s.id} to={`/shop/${s.slug}`} className="group bg-card border border-border rounded-3xl overflow-hidden shadow-soft hover:shadow-elegant transition-smooth animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="aspect-[16/9] bg-gradient-card relative overflow-hidden">
                {s.banner_url ? (
                  <img src={s.banner_url} alt={s.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="h-full w-full bg-gradient-flag opacity-80" />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3 -mt-12 mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-card border-4 border-card overflow-hidden shadow-soft shrink-0">
                    {s.logo_url ? <img src={s.logo_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-gold" />}
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                {s.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{s.city}</p>}
                {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
