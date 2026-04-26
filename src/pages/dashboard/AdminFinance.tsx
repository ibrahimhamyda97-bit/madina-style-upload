import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, Banknote, Building2, Plus, Loader2, Calendar, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  commission_rate: number;
  owner_id: string;
}

interface PaidLine {
  shop_id: string;
  unit_price_gnf: number;
  quantity: number;
  commission_rate: number;
}

interface Payout { id: string; shop_id: string; amount_gnf: number; paid_at: string; method: string | null; reference: string | null; note: string | null }

interface ShopFinance {
  shop: ShopRow;
  revenue: number;
  commission: number;
  netDue: number;
  paid: number;
  available: number;
  ordersCount: number;
}

const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

export default function AdminFinance() {
  const { user } = useAuth();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [lines, setLines] = useState<PaidLine[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: shopData }, { data: orderItems }, { data: payoutData }] = await Promise.all([
        supabase.from("shops").select("id, name, slug, commission_rate, owner_id").order("name"),
        supabase
          .from("order_items")
          .select("shop_id, unit_price_gnf, quantity, commission_rate, order:orders!inner(status)")
          .eq("order.status", "paid"),
        supabase.from("payouts").select("*").order("paid_at", { ascending: false }),
      ]);
      setShops((shopData as any) ?? []);
      setLines((orderItems as any) ?? []);
      setPayouts((payoutData as any) ?? []);
      setLoading(false);
    })();
  }, [refreshKey]);

  const finances = useMemo<ShopFinance[]>(() => {
    return shops.map((shop) => {
      const shopLines = lines.filter((l) => l.shop_id === shop.id);
      const revenue = shopLines.reduce((s, l) => s + l.unit_price_gnf * l.quantity, 0);
      const commission = shopLines.reduce((s, l) => s + Math.round(l.unit_price_gnf * l.quantity * (l.commission_rate / 100)), 0);
      const netDue = revenue - commission;
      const paid = payouts.filter((p) => p.shop_id === shop.id).reduce((s, p) => s + p.amount_gnf, 0);
      const available = netDue - paid;
      return { shop, revenue, commission, netDue, paid, available, ordersCount: shopLines.length };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [shops, lines, payouts]);

  const totals = useMemo(() => ({
    revenue: finances.reduce((s, f) => s + f.revenue, 0),
    commission: finances.reduce((s, f) => s + f.commission, 0),
    netDue: finances.reduce((s, f) => s + f.netDue, 0),
    paid: finances.reduce((s, f) => s + f.paid, 0),
    available: finances.reduce((s, f) => s + f.available, 0),
  }), [finances]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" /> Finance
        </h1>
        <p className="text-muted-foreground mt-2">Chiffre d'affaires, commission Madina et versements aux vendeurs.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="CA total" value={totals.revenue} accent="primary" icon={TrendingUp} />
        <Kpi label="Commission Madina" value={totals.commission} accent="gold" icon={Banknote} />
        <Kpi label="Net dû vendeurs" value={totals.netDue} icon={Building2} />
        <Kpi label="Déjà versé" value={totals.paid} icon={Banknote} />
        <Kpi label="Disponible à verser" value={totals.available} accent="emerald" icon={Wallet} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-lg font-bold">Par boutique</h2>
          <p className="text-xs text-muted-foreground">Calculé sur les commandes <strong className="text-foreground">payées</strong> uniquement.</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : finances.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Aucune boutique pour l'instant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Boutique</th>
                  <th className="text-right py-3 px-3 font-medium">CA</th>
                  <th className="text-right py-3 px-3 font-medium hidden sm:table-cell">Comm.</th>
                  <th className="text-right py-3 px-3 font-medium">Net dû</th>
                  <th className="text-right py-3 px-3 font-medium hidden md:table-cell">Versé</th>
                  <th className="text-right py-3 px-3 font-medium">Disponible</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {finances.map((f) => (
                  <tr key={f.shop.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-flag shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{f.shop.name}</p>
                          <p className="text-[11px] text-muted-foreground">Commission {f.shop.commission_rate}% · {f.ordersCount} ligne(s)</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-3 font-medium">{fmt(f.revenue)}</td>
                    <td className="text-right py-3 px-3 text-secondary-foreground/90 hidden sm:table-cell">{fmt(f.commission)}</td>
                    <td className="text-right py-3 px-3 font-medium">{fmt(f.netDue)}</td>
                    <td className="text-right py-3 px-3 text-muted-foreground hidden md:table-cell">{fmt(f.paid)}</td>
                    <td className={cn("text-right py-3 px-3 font-bold", f.available > 0 ? "text-primary" : "text-muted-foreground")}>{fmt(f.available)}</td>
                    <td className="py-3 px-3 text-right">
                      <ShopActions
                        finance={f}
                        adminId={user!.id}
                        onChange={() => setRefreshKey((k) => k + 1)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent payouts */}
      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold">Versements récents</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Aucun versement enregistré.</div>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.slice(0, 12).map((p) => {
              const shop = shops.find((s) => s.id === p.shop_id);
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-smooth">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{shop?.name ?? "Boutique"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(p.paid_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      {p.method && ` · ${p.method}`}{p.reference && ` · ${p.reference}`}
                    </p>
                  </div>
                  <p className="font-display font-bold text-primary">{fmt(p.amount_gnf)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: "primary" | "gold" | "emerald" }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border shadow-soft",
      accent === "primary" ? "bg-primary/5 border-primary/20" :
      accent === "gold" ? "bg-secondary/10 border-secondary/30" :
      accent === "emerald" ? "bg-gradient-card border-primary/20" :
      "bg-card border-border"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="font-display text-xl md:text-2xl font-bold mt-2">
        {fmt(value)} <span className="text-xs font-medium text-muted-foreground">GNF</span>
      </p>
    </div>
  );
}

function ShopActions({ finance, adminId, onChange }: { finance: ShopFinance; adminId: string; onChange: () => void }) {
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={commOpen} onOpenChange={setCommOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="ghost" className="rounded-xl h-8 w-8 p-0" aria-label="Modifier la commission">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <CommissionDialog finance={finance} onClose={() => setCommOpen(false)} onSaved={onChange} />
      </Dialog>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={finance.available <= 0} className="rounded-xl h-8 px-3 text-xs">
            <Plus className="h-3.5 w-3.5" /> Verser
          </Button>
        </DialogTrigger>
        <PayoutDialog finance={finance} adminId={adminId} onClose={() => setPayoutOpen(false)} onSaved={onChange} />
      </Dialog>
    </div>
  );
}

function PayoutDialog({ finance, adminId, onClose, onSaved }: { finance: ShopFinance; adminId: string; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.max(0, finance.available)));
  const [method, setMethod] = useState("Orange Money");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Montant invalide");
    setSaving(true);
    const { error } = await supabase.from("payouts").insert({
      shop_id: finance.shop.id,
      amount_gnf: n,
      method: method || null,
      reference: reference || null,
      note: note || null,
      created_by: adminId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Versement enregistré");
    onSaved();
    onClose();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Verser à {finance.shop.name}</DialogTitle>
        <DialogDescription>
          Disponible : <strong className="text-primary">{fmt(finance.available)} GNF</strong>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Montant (GNF) *</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Méthode</Label>
          <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Orange Money / MTN / Espèces" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Référence</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. OM-1234" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Note</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={save} disabled={saving} className="bg-gradient-gold text-secondary-foreground shadow-gold">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement</> : "Enregistrer le versement"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CommissionDialog({ finance, onClose, onSaved }: { finance: ShopFinance; onClose: () => void; onSaved: () => void }) {
  const [rate, setRate] = useState(String(finance.shop.commission_rate));
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(rate);
    if (!Number.isFinite(n) || n < 0 || n > 100) return toast.error("Taux invalide (0-100)");
    setSaving(true);
    const { error } = await supabase.from("shops").update({ commission_rate: n }).eq("id", finance.shop.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Commission mise à jour");
    onSaved();
    onClose();
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Commission Madina</DialogTitle>
        <DialogDescription>Pour {finance.shop.name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label className="text-xs">Taux (%)</Label>
        <Input type="number" min={0} max={100} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
        <p className="text-[11px] text-muted-foreground">Ce taux s'applique aux nouvelles ventes ; les commandes déjà payées gardent leur taux d'origine.</p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
