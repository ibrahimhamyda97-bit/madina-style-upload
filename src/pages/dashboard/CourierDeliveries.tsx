import { useEffect, useMemo, useState } from "react";
import { Truck, MapPin, Phone, Package, CheckCircle2, KeyRound, Loader2, Navigation, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

const dStatus: Record<string, { label: string; className: string }> = {
  unassigned: { label: "À prendre", className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  assigned: { label: "Assignée", className: "bg-primary/15 text-primary border-primary/30" },
  picked_up: { label: "Prise en charge", className: "bg-accent/20 text-accent-foreground border-accent/40" },
  in_transit: { label: "En route", className: "bg-primary/20 text-primary border-primary/40" },
  delivered: { label: "Livrée", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  failed: { label: "Échec", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface Order {
  id: string;
  reference: string;
  total_gnf: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  delivery_status: string;
  courier_id: string | null;
  pickup_code: string | null;
  delivery_code: string | null;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  items: Array<{ id: string; title: string; image_url: string | null; quantity: number; size: string; shop_id: string }>;
}

interface ShopInfo { id: string; name: string; phone: string | null; city: string | null }

export default function CourierDeliveries() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Record<string, ShopInfo>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [codeDialog, setCodeDialog] = useState<{ orderId: string; type: "pickup" | "delivery" } | null>(null);
  const [codeInput, setCodeInput] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("id, reference, total_gnf, customer_name, customer_phone, customer_address, delivery_status, courier_id, pickup_code, delivery_code, created_at, picked_up_at, delivered_at, items:order_items(id, title, image_url, quantity, size, shop_id)")
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const list = (ordersData ?? []) as unknown as Order[];
    setOrders(list);

    // Fetch shops referenced in items
    const shopIds = Array.from(new Set(list.flatMap((o) => o.items.map((i) => i.shop_id))));
    if (shopIds.length) {
      const { data: shopsData } = await supabase
        .from("shops")
        .select("id, name, phone, city")
        .in("id", shopIds);
      const map: Record<string, ShopInfo> = {};
      (shopsData ?? []).forEach((s: any) => { map[s.id] = s; });
      setShops(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  const available = useMemo(
    () => orders.filter((o) => o.delivery_status === "unassigned" || (o.delivery_status === "assigned" && o.courier_id !== user?.id)),
    [orders, user]
  );
  const mine = useMemo(
    () => orders.filter((o) => o.courier_id === user?.id && o.delivery_status !== "delivered"),
    [orders, user]
  );
  const list = tab === "available" ? available : mine;

  async function claim(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("courier_claim_order", { p_order_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Commande attribuée — rendez-vous chez le vendeur");
    setTab("mine");
    load();
  }

  async function setInTransit(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc("courier_set_in_transit", { p_order_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Statut : en route");
    load();
  }

  async function submitCode() {
    if (!codeDialog) return;
    setBusy(codeDialog.orderId);
    const fn = codeDialog.type === "pickup" ? "courier_confirm_pickup" : "courier_confirm_delivery";
    const { error } = await supabase.rpc(fn, { p_order_id: codeDialog.orderId, p_code: codeInput.trim() });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(codeDialog.type === "pickup" ? "Prise en charge confirmée" : "Livraison confirmée 🎉");
    setCodeDialog(null);
    setCodeInput("");
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Truck className="h-7 w-7 text-primary" /> Livraisons
        </h1>
        <p className="text-muted-foreground mt-2">Prenez en charge les commandes payées et livrez-les en sécurité.</p>
      </div>

      <div className="flex gap-2">
        <TabBtn active={tab === "available"} onClick={() => setTab("available")}>Disponibles · {available.length}</TabBtn>
        <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>Mes livraisons · {mine.length}</TabBtn>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Chargement…</div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl py-12 text-center text-muted-foreground">
          {tab === "available" ? "Aucune commande à prendre pour l'instant." : "Aucune livraison en cours."}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((o) => {
            const meta = dStatus[o.delivery_status] ?? dStatus.unassigned;
            const shopIds = Array.from(new Set(o.items.map((i) => i.shop_id)));
            const isMine = o.courier_id === user?.id;
            return (
              <div key={o.id} className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">N° de colis</p>
                    <p className="font-mono text-base font-bold text-foreground mt-0.5 select-all">{o.reference}</p>
                    <p className="font-display text-xl font-bold mt-2">
                      {fmt(o.total_gnf)} <span className="text-xs text-muted-foreground font-medium">GNF</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(o.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-full", meta.className)}>{meta.label}</Badge>
                </div>

                {/* Pickup code shown to vendor */}
                {isMine && o.delivery_status === "assigned" && o.pickup_code && (
                  <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-primary flex items-center gap-1.5">
                          <KeyRound className="h-3 w-3" /> Code à montrer au vendeur
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                          Le vendeur saisira ce code pour vous remettre le colis n° <span className="font-mono font-semibold">{o.reference}</span>.
                        </p>
                      </div>
                      <p className="font-mono text-3xl font-bold tracking-[0.3em] text-primary select-all">{o.pickup_code}</p>
                    </div>
                  </div>
                )}

                {/* Pickup addresses */}
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Récupérer chez</p>
                  {shopIds.map((sid) => {
                    const s = shops[sid];
                    return (
                      <div key={sid} className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
                        <Store className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{s?.name ?? "Boutique"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s?.city ?? "—"}{s?.phone && ` · ${s.phone}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Delivery address */}
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Livrer à</p>
                  <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{o.customer_name ?? "Client"}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />{o.customer_phone ?? "—"}</p>
                      <p className="text-[12px] mt-1 flex items-start gap-1.5"><MapPin className="h-3 w-3 mt-0.5 shrink-0" />{o.customer_address ?? "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {it.image_url && <img src={it.image_url} className="h-full w-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{it.title}</p>
                        <p className="text-[11px] text-muted-foreground">Taille {it.size} · ×{it.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {!isMine && o.delivery_status === "unassigned" && (
                    <Button onClick={() => claim(o.id)} disabled={busy === o.id} className="rounded-xl">
                      {busy === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                      Prendre cette livraison
                    </Button>
                  )}
                  {isMine && o.delivery_status === "assigned" && (
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2 flex items-center gap-2">
                      <KeyRound className="h-3 w-3" /> En attente : montrez le code ci-dessus au vendeur pour récupérer le colis.
                    </div>
                  )}
                  {isMine && o.delivery_status === "picked_up" && (
                    <>
                      <Button onClick={() => setInTransit(o.id)} disabled={busy === o.id} variant="outline" className="rounded-xl">
                        <Navigation className="h-4 w-4" /> Je suis en route
                      </Button>
                      <Button onClick={() => { setCodeDialog({ orderId: o.id, type: "delivery" }); setCodeInput(""); }} className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold">
                        <CheckCircle2 className="h-4 w-4" /> Confirmer la livraison
                      </Button>
                    </>
                      <Button onClick={() => { setCodeDialog({ orderId: o.id, type: "delivery" }); setCodeInput(""); }} className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold">
                        <CheckCircle2 className="h-4 w-4" /> Confirmer la livraison
                      </Button>
                    </>
                  )}
                  {isMine && o.delivery_status === "in_transit" && (
                    <Button onClick={() => { setCodeDialog({ orderId: o.id, type: "delivery" }); setCodeInput(""); }} className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold">
                      <CheckCircle2 className="h-4 w-4" /> Confirmer la livraison
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!codeDialog} onOpenChange={(o) => !o && setCodeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {codeDialog?.type === "pickup" ? "Code du vendeur" : "Code de l'acheteur"}
            </DialogTitle>
            <DialogDescription>
              {codeDialog?.type === "pickup"
                ? "Demandez au vendeur son code à 6 chiffres pour confirmer que vous prenez le colis."
                : "Demandez à l'acheteur son code à 6 chiffres pour confirmer la remise du colis."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="auth-code">Code à 6 chiffres</Label>
            <Input
              id="auth-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="text-center text-2xl font-mono tracking-[0.4em] h-14"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeDialog(null)}>Annuler</Button>
            <Button onClick={submitCode} disabled={codeInput.length !== 6 || !!busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
        active ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:bg-muted/70"
      )}
    >
      {children}
    </button>
  );
}
