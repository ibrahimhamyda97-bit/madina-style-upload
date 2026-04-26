import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, Check, X, ChevronRight, KeyRound, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const statusMeta: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  paid: { label: "Payée", icon: Check, className: "bg-primary/15 text-primary border-primary/30" },
  cancelled: { label: "Annulée", icon: X, className: "bg-destructive/10 text-destructive border-destructive/30" },
  refunded: { label: "Remboursée", icon: X, className: "bg-muted text-muted-foreground border-border" },
};

const deliveryLabels: Record<string, string> = {
  unassigned: "En attente d'un livreur",
  assigned: "Livreur en route vers la boutique",
  picked_up: "Colis récupéré",
  in_transit: "En cours de livraison",
  delivered: "Livrée ✓",
  failed: "Livraison échouée",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <div className="container py-16 text-center text-muted-foreground">Connectez-vous pour voir vos commandes.</div>;

  return (
    <div className="container py-8 md:py-12 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Mes commandes</h1>
          <p className="text-sm text-muted-foreground">{orders.length} commande{orders.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-lg font-semibold">Aucune commande pour l'instant</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Vos achats apparaîtront ici.</p>
          <Button asChild size="lg" className="rounded-2xl"><Link to="/shops">Parcourir les boutiques</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const meta = statusMeta[o.status] ?? statusMeta.pending;
            const Icon = meta.icon;
            return (
              <div key={o.id} className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft hover:shadow-elegant transition-smooth">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{o.reference}</p>
                    <p className="font-display text-lg font-bold mt-0.5">
                      {Number(o.total_gnf).toLocaleString("fr-FR")} <span className="text-sm font-medium text-muted-foreground">GNF</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                      {o.payment_operator && <> · {o.payment_operator}</>}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-full font-medium", meta.className)}>
                    <Icon className="h-3 w-3 mr-1" /> {meta.label}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 overflow-x-auto pb-1">
                  {(o.items ?? []).slice(0, 5).map((it: any) => (
                    <div key={it.id} className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-muted border border-border">
                      {it.image_url ? <img src={it.image_url} alt={it.title} className="h-full w-full object-cover" /> : null}
                    </div>
                  ))}
                  {(o.items?.length ?? 0) > 5 && (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-muted grid place-items-center text-xs font-bold text-muted-foreground">
                      +{o.items.length - 5}
                    </div>
                  )}
                  <div className="ml-auto text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                    {o.items?.length ?? 0} article{(o.items?.length ?? 0) > 1 ? "s" : ""} <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
