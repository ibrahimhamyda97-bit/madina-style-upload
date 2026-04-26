import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ShoppingCart, Package, ArrowRight, Sparkles } from "lucide-react";

export default function ClientOverview() {
  const { user } = useAuth();
  const { count } = useCart();
  const [orderCount, setOrderCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setOrderCount(count ?? 0));
    supabase.from("profiles").select("first_name,city,neighborhood").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bonjour {profile?.first_name || ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Bienvenue sur votre espace client Madina.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Articles dans le panier"
          value={count}
          to="/cart"
          cta="Voir mon panier"
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Mes commandes"
          value={orderCount}
          to="/orders"
          cta="Suivre mes commandes"
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Livraison"
          value={profile?.city ? `${profile.city}` : "À renseigner"}
          to="/account/profile"
          cta={profile?.city ? "Modifier" : "Ajouter mon adresse"}
        />
      </div>

      <div className="bg-gradient-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          <ShoppingBag className="h-4 w-4" /> Découvrez
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Trouvez la perle rare</h2>
        <p className="text-sm text-muted-foreground mb-4">Parcourez les boutiques validées de Madina et ajoutez vos coups de cœur au panier.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/">Explorer la marketplace</Link></Button>
          <Button asChild variant="secondary"><Link to="/shops">Voir les boutiques</Link></Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, to, cta }: { icon: React.ReactNode; label: string; value: any; to: string; cta: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft flex flex-col">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">{icon}<span>{label}</span></div>
      <p className="font-display text-2xl font-bold mt-2 mb-4">{value}</p>
      <Link to={to} className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
