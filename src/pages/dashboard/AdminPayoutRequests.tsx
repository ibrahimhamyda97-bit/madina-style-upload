import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Loader2, CheckCircle2, XCircle, Store, Truck, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (n: number) => Number(n ?? 0).toLocaleString("fr-FR");

type Status = "pending" | "approved" | "rejected" | "confirmed";

interface Req {
  id: string;
  requester_id: string;
  requester_type: "shop" | "courier";
  shop_id: string | null;
  amount_gnf: number;
  payout_method: string;
  payout_account: string;
  note: string | null;
  status: Status;
  admin_note: string | null;
  payment_reference: string | null;
  created_at: string;
  reviewed_at: string | null;
  confirmed_at: string | null;
}

const statusMeta: Record<Status, { label: string; cls: string }> = {
  pending: { label: "À traiter", cls: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  approved: { label: "Approuvée", cls: "bg-primary/15 text-primary border-primary/30" },
  rejected: { label: "Refusée", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  confirmed: { label: "Reçue", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

export default function AdminPayoutRequests() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [shops, setShops] = useState<Record<string, { name: string }>>({});
  const [profiles, setProfiles] = useState<Record<string, { first_name: string | null; last_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"all" | Status>("pending");
  const [reviewing, setReviewing] = useState<Req | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payout_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { toast.error(error.message); setLoading(false); return; }
      const list = (data as any as Req[]) ?? [];
      setRequests(list);

      const shopIds = Array.from(new Set(list.filter((r) => r.shop_id).map((r) => r.shop_id as string)));
      if (shopIds.length) {
        const { data: s } = await supabase.from("shops").select("id, name").in("id", shopIds);
        const m: Record<string, { name: string }> = {};
        (s ?? []).forEach((x: any) => { m[x.id] = { name: x.name }; });
        setShops(m);
      }
      const userIds = Array.from(new Set(list.map((r) => r.requester_id)));
      if (userIds.length) {
        const { data: p } = await supabase.rpc("get_basic_profiles", { _ids: userIds });
        const m: Record<string, any> = {};
        (p ?? []).forEach((x: any) => { m[x.id] = x; });
        setProfiles(m);
      }
      setLoading(false);
    })();
  }, [refresh]);

  const filtered = useMemo(
    () => (tab === "all" ? requests : requests.filter((r) => r.status === tab)),
    [tab, requests]
  );

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    confirmed: requests.filter((r) => r.status === "confirmed").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" /> Demandes de retrait
        </h1>
        <p className="text-muted-foreground mt-2">Validez les demandes des vendeurs et livreurs. Le demandeur confirme la réception après paiement.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "confirmed", "rejected", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium border transition-smooth",
              tab === t ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {t === "all" ? "Tous" : statusMeta[t].label}
            {t !== "all" && <span className="ml-1.5 text-[10px] opacity-70">({counts[t]})</span>}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Aucune demande.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const M = statusMeta[r.status];
              const prof = profiles[r.requester_id];
              const who = r.requester_type === "shop" && r.shop_id
                ? shops[r.shop_id]?.name ?? "Boutique"
                : `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || "Livreur";
              return (
                <li key={r.id} className="px-5 py-4 flex flex-wrap items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    {r.requester_type === "shop" ? <Store className="h-5 w-5 text-primary" /> : <Truck className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{who}</p>
                      <Badge variant="outline" className={cn("text-[10px]", M.cls)}>{M.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      {" · "}{r.payout_method} · {r.payout_account}
                    </p>
                    {r.note && <p className="text-[11px] text-muted-foreground mt-1 italic">« {r.note} »</p>}
                    {r.admin_note && <p className="text-[11px] text-muted-foreground mt-1">Note admin : {r.admin_note}</p>}
                    {r.payment_reference && <p className="text-[11px] text-muted-foreground mt-1">Réf. paiement : <span className="font-mono">{r.payment_reference}</span></p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{fmt(r.amount_gnf)} <span className="text-xs text-muted-foreground font-medium">GNF</span></p>
                    {r.status === "pending" && (
                      <Button size="sm" className="rounded-xl mt-2" onClick={() => setReviewing(r)}>
                        Traiter
                      </Button>
                    )}
                    {r.status === "approved" && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> En attente de confirmation</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        {reviewing && (
          <ReviewDialog
            req={reviewing}
            who={reviewing.requester_type === "shop" && reviewing.shop_id ? shops[reviewing.shop_id]?.name ?? "Boutique" : `${profiles[reviewing.requester_id]?.first_name ?? ""} ${profiles[reviewing.requester_id]?.last_name ?? ""}`.trim() || "Livreur"}
            onClose={() => setReviewing(null)}
            onDone={() => { setReviewing(null); setRefresh((k) => k + 1); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function ReviewDialog({ req, who, onClose, onDone }: { req: Req; who: string; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function act(approve: boolean) {
    setBusy(approve ? "approve" : "reject");
    const { error } = await supabase.rpc("review_payout_request" as any, {
      p_request_id: req.id,
      p_approve: approve,
      p_payment_reference: reference || null,
      p_admin_note: note || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Demande approuvée — le demandeur doit confirmer la réception" : "Demande refusée");
    onDone();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Traiter la demande</DialogTitle>
        <DialogDescription>
          {who} — <strong>{fmt(req.amount_gnf)} GNF</strong> via {req.payout_method} ({req.payout_account})
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Référence de paiement (en cas d'approbation)</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. OM-983221" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Note (facultatif)</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précisions, motif de refus…" />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="destructive" onClick={() => act(false)} disabled={busy !== null}>
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Refuser
        </Button>
        <Button onClick={() => act(true)} disabled={busy !== null} className="bg-gradient-gold text-secondary-foreground shadow-gold">
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approuver
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
