import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Store, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " GNF";

export default function VendorOverview() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [productCount, setProductCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("shops")
        .select("id,name,slug,status,rejection_reason,city,phone")
        .eq("owner_id", user.id)
        .maybeSingle();
      setShop(data);
      if (data) {
        const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", data.id);
        setProductCount(count ?? 0);
        const { data: prods } = await supabase
          .from("products")
          .select("id,title,price_gnf,shipping_fee_gnf,status,rejection_reason,created_at,category,product_images(image_url,position)")
          .eq("shop_id", data.id)
          .order("created_at", { ascending: false });
        setProducts(prods ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  if (!shop) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-2xl font-bold mb-2">Aucune boutique</h2>
        <p className="text-muted-foreground mb-6">Ouvrez votre boutique pour commencer à vendre sur Madina.</p>
        <Button asChild><Link to="/onboarding/shop">Ouvrir ma boutique</Link></Button>
      </div>
    );
  }

  const isApproved = shop.status === "approved";
  const isPending = shop.status === "pending";
  const isRejected = shop.status === "rejected";

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Bonjour 👋</h1>
        <p className="text-muted-foreground mt-1">Voici un aperçu de votre boutique <strong className="text-foreground">{shop.name}</strong>.</p>
      </div>

      {/* Status banner */}
      {isPending && (
        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-4 items-start">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-display font-semibold">Boutique en attente de validation</p>
            <p className="text-sm text-muted-foreground mt-1">Notre équipe vérifie votre dossier (pièce d'identité). Vous serez notifié dès la validation et pourrez alors ajouter vos produits.</p>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="mb-8 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 flex gap-4 items-start">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-display font-semibold">Demande rejetée</p>
            <p className="text-sm text-muted-foreground mt-1">{shop.rejection_reason || "Veuillez contacter l'équipe Madina."}</p>
          </div>
        </div>
      )}
      {isApproved && (
        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex gap-4 items-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm"><strong>Boutique validée</strong> — vous pouvez ajouter et publier vos produits.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Package className="h-5 w-5" />} label="Produits" value={productCount} />
        <StatCard icon={<Store className="h-5 w-5" />} label="Ville" value={shop.city || "—"} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Statut" value={isApproved ? "Validée" : isPending ? "En attente" : "Rejetée"} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isApproved ? (
          <>
            <Button asChild><Link to="/vendor/products/new"><Plus className="h-4 w-4" /> Ajouter un produit</Link></Button>
            <Button asChild variant="secondary"><Link to="/vendor/products"><Package className="h-4 w-4" /> Mes produits</Link></Button>
          </>
        ) : (
          <Button disabled variant="secondary"><Plus className="h-4 w-4" /> Ajout de produit indisponible</Button>
        )}
        <Button asChild variant="ghost"><Link to="/vendor/shop"><Store className="h-4 w-4" /> Ma boutique</Link></Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">{icon}<span>{label}</span></div>
      <p className="font-display text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
