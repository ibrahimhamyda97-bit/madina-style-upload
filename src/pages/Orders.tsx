import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, Clock, Check, X, ChevronRight, KeyRound, Truck, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Handle SenePay return
  useEffect(() => {
    if (!user) return;
    const senepayReturn = searchParams.get("senepay");

    if (senepayReturn) {
      verifyPayment();
      setSearchParams({}, { replace: true });
    }
  }, [user, searchParams, setSearchParams]);

  async function verifyPayment() {
    const { data: recent } = await supabase
      .from("orders")
      .select("cinetpay_transaction_id")
      .eq("user_id", user!.id)
      .eq("status", "pending")
      .not("cinetpay_transaction_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sessionToken = recent?.cinetpay_transaction_id;
    if (!sessionToken) {
      toast.info("Votre commande est en cours de traitement.");
      return;
    }

    setVerifyingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("senepay-verify", {
        body: { session_token: sessionToken },
      });

      if (error) {
        console.error("SenePay verify error:", error);
        toast.error("Impossible de vérifier le paiement. Rechargez la page dans quelques instants.");
        return;
      }

      if (data?.paid) {
        toast.success("Paiement confirmé ! Votre commande est validée.", { duration: 5000 });
      } else {
        toast.info("Le paiement est en cours de traitement. Votre commande sera validée automatiquement.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de vérification du paiement.");
    } finally {
      setVerifyingPayment(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, items:order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    fetchOrders();
    const ch = supabase
      .channel(`orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
        {verifyingCinetPay && (
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification du paiement...
          </div>
        )}
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
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={cn("rounded-full font-medium", meta.className)}>
                      <Icon className="h-3 w-3 mr-1" /> {meta.label}
                    </Badge>
                    {o.cinetpay_transaction_id && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> CinetPay
                      </span>
                    )}
                  </div>
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

                {o.status === "paid" && o.delivery_code && o.delivery_status !== "delivered" && (
                  <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-primary flex items-center gap-1.5">
                          <KeyRound className="h-3 w-3" /> Votre code de livraison
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                          Donnez ce code au livreur uniquement à la remise du colis.
                        </p>
                      </div>
                      <p className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">{o.delivery_code}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                      <Truck className="h-3 w-3" /> {deliveryLabels[o.delivery_status] ?? o.delivery_status}
                    </p>
                  </div>
                )}
                {o.status === "paid" && o.delivery_status === "delivered" && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4" /> Colis livré le {o.delivered_at ? new Date(o.delivered_at).toLocaleDateString("fr-FR") : "—"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
