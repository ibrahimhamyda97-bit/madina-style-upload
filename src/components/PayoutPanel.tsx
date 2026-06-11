import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet, Loader2, Plus, CheckCircle2, Clock, XCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => Number(n ?? 0).toLocaleString("fr-FR");

type Status = "pending" | "approved" | "rejected" | "confirmed";

interface PayoutRequest {
  id: string;
  amount_gnf: number;
  payout_method: string;
  payout_account: string;
  note: string | null;
  status: Status;
  admin_note: string | null;
  payment_reference: string | null;
  reviewed_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

const statusMeta: Record<Status, { label: string; icon: any; cls: string }> = {
  pending: { label: "En attente", icon: Clock, cls: "bg-secondary/15 text-secondary-foreground border-secondary/40" },
  approved: { label: "Approuvée — à confirmer", icon: CheckCircle2, cls: "bg-primary/15 text-primary border-primary/30" },
  rejected: { label: "Refusée", icon: XCircle, cls: "bg-destructive/10 text-destructive border-destructive/30" },
  confirmed: { label: "Reçue", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

export default function PayoutPanel({
  scope,
  shopId,
  userId,
}: {
  scope: "shop" | "courier";
  shopId?: string;
  userId: string;
}) {
  const [balance, setBalance] = useState<number>(0);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const balPromise = scope === "shop"
        ? supabase.rpc("shop_available_balance" as any, { _shop_id: shopId })
        : supabase.rpc("courier_available_balance" as any, { _courier_id: userId });

      const reqQuery = supabase
        .from("payout_requests" as any)
        .select("*")
        .eq("requester_id", userId)
        .order("created_at", { ascending: false });

      const [{ data: bal }, { data: reqs, error: reqErr }] = await Promise.all([balPromise, reqQuery]);
      if (reqErr) toast.error(reqErr.message);
      setBalance(Number(bal ?? 0));
      setRequests((reqs as any) ?? []);
      setLoading(false);
    })();
  }, [scope, shopId, userId, refreshKey]);

  async function confirmReception(id: string) {
    const { error } = await supabase.rpc("confirm_payout_reception" as any, { p_request_id: id });
    if (error) return toast.error(error.message);
    toast.success("Réception confirmée ✓");
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Solde &amp; retraits
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Solde disponible :{" "}
            <strong className="text-primary text-base">{fmt(balance)} GNF</strong>
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={balance <= 0}
              className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold"
            >
              <Plus className="h-4 w-4" /> Demander un retrait
            </Button>
          </DialogTrigger>
          <RequestDialog
            scope={scope}
            shopId={shopId}
            balance={balance}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); setRefreshKey((k) => k + 1); }}
          />
        </Dialog>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : requests.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">Aucune demande de retrait pour l'instant.</div>
      ) : (
        <ul className="divide-y divide-border">
          {requests.map((r) => {
            const M = statusMeta[r.status];
            return (
              <li key={r.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold text-primary">{fmt(r.amount_gnf)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
                    <Badge variant="outline" className={cn("gap-1 text-[10px]", M.cls)}>
                      <M.icon className="h-3 w-3" /> {M.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}{r.payout_method} · {r.payout_account}
                    {r.payment_reference && <> · Réf. {r.payment_reference}</>}
                  </p>
                  {r.admin_note && <p className="text-[11px] text-muted-foreground mt-1 italic">Note admin : {r.admin_note}</p>}
                </div>
                {r.status === "approved" && (
                  <Button size="sm" className="rounded-xl" onClick={() => confirmReception(r.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Confirmer la réception
                  </Button>
                )}
                {r.status === "confirmed" && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Banknote className="h-3 w-3" /> {r.confirmed_at && new Date(r.confirmed_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RequestDialog({
  scope, shopId, balance, onClose, onSaved,
}: {
  scope: "shop" | "courier";
  shopId?: string;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("Orange Money");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Montant invalide");
    if (n > balance) return toast.error("Le montant dépasse votre solde disponible");
    if (!account.trim()) return toast.error("Numéro de compte requis");
    setSaving(true);
    const fn = scope === "shop" ? "request_shop_payout" : "request_courier_payout";
    const params = scope === "shop"
      ? { p_shop_id: shopId, p_amount: n, p_method: method, p_account: account, p_note: note || null }
      : { p_amount: n, p_method: method, p_account: account, p_note: note || null };
    const { error } = await supabase.rpc(fn as any, params as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée — en attente de validation");
    onSaved();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Demander un retrait</DialogTitle>
        <DialogDescription>
          Solde disponible : <strong className="text-primary">{fmt(balance)} GNF</strong>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Montant (GNF) *</Label>
          <Input type="number" min={1} max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mode de paiement *</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Orange Money">Orange Money</SelectItem>
              <SelectItem value="MTN MoMo">MTN MoMo</SelectItem>
              <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
              <SelectItem value="Espèces">Espèces</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Numéro / compte de réception *</Label>
          <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex. +224 6xx xxx xxx" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Note (facultatif)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</> : "Envoyer la demande"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
