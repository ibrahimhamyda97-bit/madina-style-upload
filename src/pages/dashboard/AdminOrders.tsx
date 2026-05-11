import { useEffect, useState } from "react";
import { Package, Check, X, Phone, MapPin, Clock, Truck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  paid: { label: "Payée", className: "bg-primary/15 text-primary border-primary/30" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive border-destructive/30" },
  refunded: { label: "Remboursée", className: "bg-muted text-muted-foreground border-border" },
};

const dStatusMeta: Record<string, { label: string; className: string }> = {
  unassigned: { label: "À assigner", className: "bg-muted text-muted-foreground border-border" },
  assigned: { label: "Livreur assigné", className: "bg-primary/10 text-primary border-primary/30" },
  picked_up: { label: "Colis récupéré", className: "bg-accent/20 text-accent-foreground border-accent/40" },
  in_transit: { label: "En route", className: "bg-primary/15 text-primary border-primary/30" },
  delivered: { label: "Livrée ✓", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  failed: { label: "Échec livraison", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("pending");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => filter === "all" || o.status === filter);

  async function markPaid(id: string) {
    const { error } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Commande marquée payée");
    load();
  }

  async function cancel(id: string) {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Commande annulée");
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" /> Commandes
        </h1>
        <p className="text-muted-foreground mt-2">Validez les paiements mobile money reçus.</p>
      </div>

      <div className="flex gap-2">
        {(["pending", "paid", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
              filter === f ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {f === "pending" ? "En attente" : f === "paid" ? "Payées" : "Toutes"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl py-12 text-center text-muted-foreground">
          Aucune commande dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const meta = statusMeta[o.status] ?? statusMeta.pending;
            return (
              <div key={o.id} className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{o.reference}</p>
                    <p className="font-display text-xl font-bold mt-0.5">
                      {Number(o.total_gnf).toLocaleString("fr-FR")} <span className="text-xs text-muted-foreground font-medium">GNF</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {new Date(o.created_at).toLocaleString("fr-FR")}
                      {o.payment_operator && <> · {o.payment_operator}</>}
                      {o.payment_reference && <> · réf. {o.payment_reference}</>}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-full", meta.className)}>{meta.label}</Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                  <InfoRow icon={Phone} label={o.customer_name} sub={o.customer_phone} />
                  <InfoRow icon={MapPin} label="Livraison" sub={o.customer_address} />
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {(o.items ?? []).map((it: any) => (
                    <div key={it.id} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {it.image_url && <img src={it.image_url} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{it.title}</p>
                        <p className="text-[11px] text-muted-foreground">Taille {it.size} · ×{it.quantity}</p>
                      </div>
                      <p className="font-medium tabular-nums">{(it.unit_price_gnf * it.quantity).toLocaleString("fr-FR")} GNF</p>
                    </div>
                  ))}
                </div>

                {o.status === "pending" && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    <Button onClick={() => markPaid(o.id)} className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold">
                      <Check className="h-4 w-4" /> Marquer comme payée
                    </Button>
                    <Button variant="outline" onClick={() => cancel(o.id)} className="rounded-xl text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground">
                      <X className="h-4 w-4" /> Annuler
                    </Button>
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

function InfoRow({ icon: Icon, label, sub }: { icon: any; label?: string | null; sub?: string | null }) {
  return (
    <div className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label || "—"}</p>
        {sub && <p className="text-[11px] text-muted-foreground break-words">{sub}</p>}
      </div>
    </div>
  );
}
