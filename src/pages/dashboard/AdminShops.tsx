import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, XCircle, FileText, Clock, Store, Search,
  MapPin, Phone, ExternalLink, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Shop {
  id: string; name: string; slug: string; city: string | null; created_at: string;
  status: "pending" | "approved" | "rejected";
  phone: string | null; id_document_url: string | null; rejection_reason: string | null;
  owner_id: string; logo_url: string | null; banner_url: string | null;
}

type TabKey = "all" | "pending" | "approved" | "rejected";

export default function AdminShops() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [docOpen, setDocOpen] = useState<Shop | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Shop | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("shops")
      .select("id,name,slug,city,created_at,status,phone,id_document_url,rejection_reason,owner_id,logo_url,banner_url")
      .order("created_at", { ascending: false });
    setShops((data ?? []) as Shop[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(s: Shop) {
    const { error } = await supabase
      .from("shops")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id, rejection_reason: null })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Boutique ${s.name} validée`);
    load();
  }

  async function reject() {
    if (!rejectOpen) return;
    const { error } = await supabase
      .from("shops")
      .update({ status: "rejected", rejection_reason: rejectReason || "Dossier incomplet" })
      .eq("id", rejectOpen.id);
    if (error) return toast.error(error.message);
    toast.success("Boutique rejetée");
    setRejectOpen(null); setRejectReason("");
    load();
  }

  async function viewDoc(s: Shop) {
    if (!s.id_document_url) return toast.error("Aucune pièce");
    setDocOpen(s);
    const { data, error } = await supabase.storage.from("identity-documents").createSignedUrl(s.id_document_url, 600);
    if (error) return toast.error(error.message);
    setDocUrl(data.signedUrl);
  }

  const counts = useMemo(() => ({
    all: shops.length,
    pending: shops.filter((s) => s.status === "pending").length,
    approved: shops.filter((s) => s.status === "approved").length,
    rejected: shops.filter((s) => s.status === "rejected").length,
  }), [shops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops
      .filter((s) => tab === "all" ? true : s.status === tab)
      .filter((s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q),
      );
  }, [shops, tab, search]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Gestion des boutiques
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Boutiques</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {counts.all} boutique{counts.all > 1 ? "s" : ""} au total · {counts.approved} validée{counts.approved > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une boutique…"
            className="pl-9 rounded-full"
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={counts.all} icon={Store} tone="primary" active={tab === "all"} onClick={() => setTab("all")} />
        <StatCard label="Validées" value={counts.approved} icon={CheckCircle2} tone="emerald" active={tab === "approved"} onClick={() => setTab("approved")} />
        <StatCard label="En attente" value={counts.pending} icon={Clock} tone="amber" active={tab === "pending"} onClick={() => setTab("pending")} />
        <StatCard label="Rejetées" value={counts.rejected} icon={XCircle} tone="rose" active={tab === "rejected"} onClick={() => setTab("rejected")} />
      </div>

      {/* Tabs (mobile-friendly fallback) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="md:hidden">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Toutes</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">Validées</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">En attente</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1">Rejetées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid of shops */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-3xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl py-20 text-center text-muted-foreground text-sm">
          Aucune boutique ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <ShopCard
              key={s.id}
              shop={s}
              onApprove={() => approve(s)}
              onReject={() => setRejectOpen(s)}
              onViewDoc={() => viewDoc(s)}
            />
          ))}
        </div>
      )}

      {/* Doc viewer */}
      <Dialog open={!!docOpen} onOpenChange={() => { setDocOpen(null); setDocUrl(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pièce d'identité — {docOpen?.name}</DialogTitle></DialogHeader>
          {docUrl ? (
            docUrl.match(/\.pdf(\?|$)/i) ? (
              <iframe src={docUrl} className="w-full h-[70vh] rounded-xl border border-border" />
            ) : (
              <img src={docUrl} alt="ID" className="w-full max-h-[70vh] object-contain rounded-xl border border-border" />
            )
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">Chargement...</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={() => setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeter la boutique</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Indiquez la raison qui sera communiquée au vendeur.</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Ex. Pièce d'identité illisible..." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(null)}>Annuler</Button>
            <Button variant="destructive" onClick={reject}>Confirmer le rejet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone, active, onClick,
}: {
  label: string; value: number; icon: any;
  tone: "primary" | "emerald" | "amber" | "rose";
  active: boolean; onClick: () => void;
}) {
  const tones: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all bg-gradient-to-br ${tones[tone]} ${
        active ? "border-current shadow-soft scale-[1.02]" : "border-border hover:border-current/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/70">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-2xl font-bold mt-2 text-foreground">{value}</p>
    </button>
  );
}

function ShopCard({
  shop: s, onApprove, onReject, onViewDoc,
}: {
  shop: Shop; onApprove: () => void; onReject: () => void; onViewDoc: () => void;
}) {
  return (
    <div className="group bg-card border border-border rounded-3xl overflow-hidden shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5">
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary/20 via-secondary/30 to-accent/20 overflow-hidden">
        {s.banner_url && (
          <img src={s.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute top-3 right-3">
          {s.status === "approved" && <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white border-0">Validée</Badge>}
          {s.status === "pending" && <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0">En attente</Badge>}
          {s.status === "rejected" && <Badge className="bg-rose-500/90 hover:bg-rose-500 text-white border-0">Rejetée</Badge>}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 -mt-8 relative">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-2xl border-4 border-card bg-muted shrink-0 overflow-hidden shadow-soft">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/30">
                <Store className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-6">
            <h3 className="font-semibold truncate">{s.name}</h3>
            <p className="text-xs text-muted-foreground truncate">/{s.slug}</p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.city || "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.phone || "—"}</span>
          </div>
        </div>

        {s.status === "rejected" && s.rejection_reason && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-500/10 rounded-lg px-3 py-2 line-clamp-2">
            {s.rejection_reason}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.status === "approved" && (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to={`/shop/${s.slug}`}>
                <ExternalLink className="h-3.5 w-3.5" /> Voir
              </Link>
            </Button>
          )}
          {s.id_document_url && (
            <Button size="sm" variant="ghost" onClick={onViewDoc} className="rounded-full">
              <FileText className="h-3.5 w-3.5" /> Pièce
            </Button>
          )}
          <div className="flex-1" />
          {s.status !== "approved" && (
            <Button size="sm" onClick={onApprove} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valider
            </Button>
          )}
          {s.status !== "rejected" && s.status !== "approved" && (
            <Button size="sm" variant="outline" onClick={onReject} className="rounded-full">
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
