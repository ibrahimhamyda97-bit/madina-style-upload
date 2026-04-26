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
      const { data: shopsList } = await supabase
        .from("shops")
        .select("id,name,slug,status,rejection_reason,city,phone,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      const data = (shopsList ?? [])[0] ?? null;
      setShop(data);
      const shopIds = (shopsList ?? []).map((s) => s.id);
      if (shopIds.length > 0) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .in("shop_id", shopIds);
        setProductCount(count ?? 0);
        const { data: prods } = await supabase
          .from("products")
          .select("id,title,price_gnf,shipping_fee_gnf,status,rejection_reason,created_at,category,product_images(image_url,position)")
          .in("shop_id", shopIds)
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

      {/* All vendor's products */}
      <div className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">Mes articles publiés</h2>
            <p className="text-sm text-muted-foreground">Tous les produits de votre boutique sur Madina.</p>
          </div>
          {isApproved && (
            <Button asChild size="sm" variant="outline"><Link to="/vendor/products">Gérer</Link></Button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Aucun article pour le moment.</p>
            {isApproved && (
              <Button asChild className="mt-4" size="sm"><Link to="/vendor/products/new"><Plus className="h-4 w-4" /> Ajouter un produit</Link></Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const img = (p.product_images ?? []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))[0]?.image_url;
              const statusVariant: any = p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary";
              const statusLabel = p.status === "approved" ? "Publié" : p.status === "rejected" ? "Rejeté" : "En attente";
              return (
                <Link
                  key={p.id}
                  to={p.status === "approved" ? `/produit/${p.id}` : "/vendor/products"}
                  className="group bg-card border border-border rounded-2xl overflow-hidden shadow-soft hover:shadow-lg transition-smooth"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {img ? (
                      <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm line-clamp-2">{p.title}</h3>
                      <Badge variant={statusVariant} className="shrink-0 text-[10px]">{statusLabel}</Badge>
                    </div>
                    <p className="font-display font-bold text-base">{fmt(p.price_gnf)}</p>
                    {p.shipping_fee_gnf > 0 && (
                      <p className="text-[11px] text-muted-foreground">+ {fmt(p.shipping_fee_gnf)} livraison</p>
                    )}
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-[11px] text-destructive mt-2 line-clamp-2">Raison : {p.rejection_reason}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
