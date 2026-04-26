import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, Package, Store, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function AdminOverview() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({ products: 0, shops: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) {
      // Non-admins shouldn't see admin dashboard
    }
    (async () => {
      const [{ count: products }, { count: shops }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("shops").select("id", { count: "exact", head: true }),
      ]);
      setStats({ products: products ?? 0, shops: shops ?? 0 });
    })();
  }, [isAdmin, loading]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Espace Admin
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Tableau de bord Madina</h1>
          <p className="text-muted-foreground mt-1">Gestion globale de la marketplace.</p>
        </div>
        <Button asChild className="bg-gradient-gold text-secondary-foreground shadow-gold">
          <Link to="/admin/products/new"><Plus className="h-4 w-4" /> Nouveau produit</Link>
        </Button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Package} label="Produits totaux" value={stats.products} />
        <Stat icon={Store} label="Boutiques" value={stats.shops} />
        <Stat icon={Users} label="Acheteurs" value={"—"} />
      </div>
      {!isAdmin && !loading && (
        <div className="mt-8 p-5 rounded-2xl border border-secondary/40 bg-secondary/10 text-sm">
          Vous voyez cette page car aucune restriction stricte n'est appliquée. Pour activer le rôle admin, ajoutez-vous au rôle <code className="bg-muted px-1 rounded">admin</code> dans la table <code className="bg-muted px-1 rounded">user_roles</code>.
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="bg-gradient-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <p className="font-display text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
