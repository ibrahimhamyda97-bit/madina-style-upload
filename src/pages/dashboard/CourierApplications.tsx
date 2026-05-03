import { useEffect, useState } from "react";
import { Truck, Check, X, Clock, Loader2, MapPin, Phone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AppRow {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    city: string | null;
    neighborhood: string | null;
    avatar_url: string | null;
  } | null;
}

type Tab = "pending" | "approved" | "rejected" | "all";

export default function CourierApplications() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<AppRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    const { data: apps } = await supabase
      .from("courier_applications")
      .select("id,user_id,status,rejection_reason,created_at,reviewed_at")
      .order("created_at", { ascending: false });
    const userIds = (apps ?? []).map((a) => a.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id,first_name,last_name,phone,city,neighborhood,avatar_url")
          .in("id", userIds)
      : { data: [] as any[] };
    const pmap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { pmap[p.id] = p; });
    setRows(((apps ?? []) as any[]).map((a) => ({ ...a, profile: pmap[a.user_id] ?? null })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function review(userId: string, approve: boolean, reason?: string) {
    setBusy(userId);
    const { error } = await supabase.rpc("review_courier_application", {
      p_user_id: userId,
      p_approve: approve,
      p_reason: reason ?? null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Livreur validé" : "Demande rejetée");
    setRejectOpen(null); setRejectReason("");
    load();
  }

  const filtered = rows.filter((r) => tab === "all" ? true : r.status === tab);
  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    all: rows.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5" /> Validation des livreurs
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
          <Truck className="h-7 w-7 text-primary" /> Demandes livreurs
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {counts.pending} demande{counts.pending > 1 ? "s" : ""} en attente · {counts.approved} validée{counts.approved > 1 ? "s" : ""}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Validées ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejetées ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-10 text-center text-muted-foreground text-sm">
          Aucune demande dans cette catégorie.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const p = a.profile;
            const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Sans nom";
            return (
              <div key={a.id} className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-flag text-white grid place-items-center font-bold uppercase">
                      {p?.avatar_url ? <img src={p.avatar_url} className="h-full w-full rounded-full object-cover" /> : (name[0] ?? "?")}
                    </div>
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Demande du {new Date(a.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {p?.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {p.phone}</p>}
                  {(p?.city || p?.neighborhood) && (
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {[p?.neighborhood, p?.city].filter(Boolean).join(", ")}</p>
                  )}
                </div>

                {a.status === "rejected" && a.rejection_reason && (
                  <p className="text-xs bg-destructive/5 border border-destructive/20 text-destructive rounded-lg p-2">
                    Motif : {a.rejection_reason}
                  </p>
                )}

                {a.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" disabled={busy === a.user_id} onClick={() => review(a.user_id, true)}>
                      {busy === a.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Valider</>}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setRejectOpen(a)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Rejeter
                    </Button>
                  </div>
                )}
                {a.status === "approved" && (
                  <Button size="sm" variant="outline" className="w-full" disabled={busy === a.user_id} onClick={() => review(a.user_id, false, "Révoqué")}>
                    Révoquer le rôle livreur
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectOpen} onOpenChange={() => setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeter la demande</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motif du rejet..." rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(null)}>Annuler</Button>
            <Button variant="destructive" disabled={busy === rejectOpen?.user_id} onClick={() => rejectOpen && review(rejectOpen.user_id, false, rejectReason || "Dossier incomplet")}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", Icon: Clock },
    approved: { label: "Validée", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", Icon: Check },
    rejected: { label: "Rejetée", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30", Icon: X },
  };
  const m = map[status] ?? map.pending;
  return <Badge variant="outline" className={`rounded-full ${m.cls}`}><m.Icon className="h-3 w-3 mr-1" /> {m.label}</Badge>;
}
