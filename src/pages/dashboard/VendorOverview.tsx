import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Package, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function VendorOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, shops: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: shops } = await supabase.from("shops").select("id").eq("owner_id", user.id);
      const shopIds = (shops ?? []).map((s) => s.id);
      let products = 0;
      let recentList: any[] = [];
      if (shopIds.length) {
        const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).in("shop_id", shopIds);
        products = count ?? 0;
        const { data: r } = await supabase.from("products").select("id,title,price_gnf,created_at").in("shop_id", shopIds).order("created_at", { ascending: false }).limit(5);
        recentList = r ?? [];
      }
      setStats({ products, shops: shopIds.length });
      setRecent(recentList);
    })();
  }, [user]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Bonjour 👋</h1>
          <p className="text-muted-foreground mt-1">Aperçu de votre activité sur Madina.</p>
        </div>
        <Button asChild className="bg-gradient-gold text-secondary-foreground shadow-gold">
          <Link to="/vendor/products/new"><Plus className="h-4 w-4" /> Nouveau produit</Link>
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard icon={Package} label="Produits" value={stats.products} />
        <StatCard icon={Store} label="Boutiques" value={stats.shops} />
        <StatCard icon={ShoppingBag} label="Ventes ce mois" value={0} />
      </div>
      <div className="bg-card border border-border rounded-3xl p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold mb-4">Derniers produits</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun produit. <Link to="/vendor/products/new" className="text-primary underline-offset-4 hover:underline">Ajoutez-en un !</Link></p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <span className="font-medium text-sm">{p.title}</span>
                <span className="text-sm text-muted-foreground">{Number(p.price_gnf).toLocaleString("fr-FR")} GNF</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-display text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
