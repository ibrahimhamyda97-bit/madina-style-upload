import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, TrendingUp, Banknote, Package, Loader2, Calendar, ShoppingBag, KeyRound, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

interface SoldLine {
  id: string;
  title: string;
  image_url: string | null;
  quantity: number;
  unit_price_gnf: number;
  commission_rate: number;
  size: string;
  product_id: string;
  order: { id: string; reference: string; created_at: string; status: string; pickup_code: string | null; delivery_status: string };
}

interface PayoutRow { id: string; amount_gnf: number; paid_at: string; method: string | null; reference: string | null; note: string | null }

export default function VendorSales() {
  const { user } = useAuth();
  const [shop, setShop] = useState<{ id: string; name: string; commission_rate: number } | null>(null);
  const [lines, setLines] = useState<SoldLine[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: shopData } = await supabase
        .from("shops")
        .select("id, name, commission_rate")
        .eq("owner_id", user.id)
        .maybeSingle();
      setShop(shopData as any);

      if (shopData) {
        const [{ data: items }, { data: payoutData }] = await Promise.all([
          supabase
            .from("order_items")
            .select("id, title, image_url, quantity, unit_price_gnf, commission_rate, size, product_id, order:orders!inner(id, reference, created_at, status, pickup_code, delivery_status)")
            .eq("shop_id", (shopData as any).id)
            .eq("order.status", "paid")
            .order("created_at", { ascending: false }),
          supabase
            .from("payouts")
            .select("id, amount_gnf, paid_at, method, reference, note")
            .eq("shop_id", (shopData as any).id)
            .order("paid_at", { ascending: false }),
        ]);
        setLines((items as any) ?? []);
        setPayouts((payoutData as any) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => {
    const revenue = lines.reduce((s, l) => s + l.unit_price_gnf * l.quantity, 0);
    const commission = lines.reduce((s, l) => s + Math.round(l.unit_price_gnf * l.quantity * (l.commission_rate / 100)), 0);
    const netDue = revenue - commission;
    const paid = payouts.reduce((s, p) => s + p.amount_gnf, 0);
    const available = netDue - paid;
    return { revenue, commission, netDue, paid, available };
  }, [lines, payouts]);

  if (loading) {
    return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>;
  }

  if (!shop) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-display text-2xl font-bold mb-2">Aucune boutique</h2>
        <p className="text-muted-foreground mb-6">Ouvrez votre boutique pour commencer à vendre.</p>
        <Button asChild><Link to="/onboarding/shop">Ouvrir ma boutique</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-primary" /> Mes ventes
        </h1>
        <p className="text-muted-foreground mt-2">Produits vendus et montant que Madina vous doit (commission {shop.commission_rate}%).</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Chiffre d'affaires" value={totals.revenue} icon={TrendingUp} accent="primary" />
        <Kpi label={`Commission Madina`} value={totals.commission} icon={Banknote} accent="gold" />
        <Kpi label="Déjà reçu" value={totals.paid} icon={Banknote} />
        <Kpi label="Madina vous doit" value={totals.available} icon={Wallet} accent="emerald" highlight />
      </div>

      {/* Highlight card */}
      <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 md:p-8 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Solde à recevoir</p>
        </div>
        <p className="font-display text-4xl md:text-5xl font-bold text-primary">
          {fmt(totals.available)} <span className="text-xl font-medium text-muted-foreground">GNF</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Montant que l'administration de Madina vous doit après commission et versements déjà effectués.
        </p>
      </div>

      {/* Pickup codes for orders awaiting handover */}
      {(() => {
        const seen = new Set<string>();
        const pending = lines.filter((l) => {
          const ds = l.order.delivery_status;
          if (seen.has(l.order.id)) return false;
          if (!["unassigned", "assigned", "picked_up"].includes(ds)) return false;
          seen.add(l.order.id);
          return true;
        });
        if (pending.length === 0) return null;
        return (
          <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Codes de prise en charge
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Donnez ce code au livreur quand il vient récupérer le colis. Ne le partagez jamais avant.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {pending.map((l) => (
                <li key={l.order.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{l.order.reference}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Truck className="h-3 w-3" />
                      {l.order.delivery_status === "unassigned" && "En attente d'un livreur"}
                      {l.order.delivery_status === "assigned" && "Livreur en route — préparez le colis"}
                      {l.order.delivery_status === "picked_up" && "Colis récupéré ✓"}
                    </p>
                  </div>
                  <p className="font-mono text-2xl font-bold tracking-[0.3em] text-primary">
                    {l.order.pickup_code ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Sold items */}
      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><Package className="h-4 w-4" /> Produits vendus</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{lines.length} ligne{lines.length > 1 ? "s" : ""} de commande payée{lines.length > 1 ? "s" : ""}.</p>
        </div>
        {lines.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Aucune vente pour le moment.</div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((l) => {
              const gross = l.unit_price_gnf * l.quantity;
              const comm = Math.round(gross * (l.commission_rate / 100));
              const net = gross - comm;
              return (
                <li key={l.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-smooth">
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                    {l.image_url ? <img src={l.image_url} alt={l.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{l.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(l.order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}<span className="font-mono">{l.order.reference}</span>
                      {" · "}Taille {l.size}{l.quantity > 1 ? ` · x${l.quantity}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{fmt(net)} <span className="text-[11px] font-medium text-muted-foreground">GNF</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Brut {fmt(gross)} · Comm. {fmt(comm)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Payouts received */}
      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><Banknote className="h-4 w-4" /> Versements reçus</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Aucun versement reçu pour l'instant.</div>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-smooth">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {new Date(p.paid_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.method ?? "—"}{p.reference && ` · ${p.reference}`}{p.note && ` · ${p.note}`}
                  </p>
                </div>
                <p className="font-display font-bold text-primary">{fmt(p.amount_gnf)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent, highlight }: { label: string; value: number; icon: any; accent?: "primary" | "gold" | "emerald"; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border shadow-soft",
      accent === "primary" ? "bg-primary/5 border-primary/20" :
      accent === "gold" ? "bg-secondary/10 border-secondary/30" :
      accent === "emerald" ? "bg-gradient-card border-primary/20" :
      "bg-card border-border",
      highlight && "ring-2 ring-primary/30"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={cn("font-display text-xl md:text-2xl font-bold mt-2", highlight && "text-primary")}>
        {fmt(value)} <span className="text-xs font-medium text-muted-foreground">GNF</span>
      </p>
    </div>
  );
}
