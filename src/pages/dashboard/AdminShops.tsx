import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, FileText, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Shop {
  id: string; name: string; slug: string; city: string; created_at: string;
  status: "pending" | "approved" | "rejected";
  phone: string | null; id_document_url: string | null; rejection_reason: string | null;
  owner_id: string;
}

export default function AdminShops() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [docOpen, setDocOpen] = useState<Shop | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Shop | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    const { data } = await supabase
      .from("shops")
      .select("id,name,slug,city,created_at,status,phone,id_document_url,rejection_reason,owner_id")
      .order("created_at", { ascending: false });
    setShops((data ?? []) as Shop[]);
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

  const filtered = shops.filter((s) => s.status === tab);
  const counts = {
    pending: shops.filter((s) => s.status === "pending").length,
    approved: shops.filter((s) => s.status === "approved").length,
    rejected: shops.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Boutiques</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-3.5 w-3.5" /> En attente
            {counts.pending > 0 && <Badge className="ml-2" variant="secondary">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle2 className="h-3.5 w-3.5" /> Validées ({counts.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-3.5 w-3.5" /> Rejetées ({counts.rejected})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Aucune boutique dans cette catégorie.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Nom</th>
                <th className="text-left px-5 py-3">Ville</th>
                <th className="text-left px-5 py-3">Téléphone</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    {s.status === "approved" ? (
                      <Link className="font-medium hover:text-primary" to={`/shop/${s.slug}`}>{s.name}</Link>
                    ) : (
                      <span className="font-medium">{s.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{s.city}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.phone || "—"}</td>
                  <td className="px-5 py-3">
                    {s.status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Validée</Badge>}
                    {s.status === "pending" && <Badge variant="secondary">En attente</Badge>}
                    {s.status === "rejected" && <Badge variant="destructive">Rejetée</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {s.id_document_url && (
                        <Button size="sm" variant="ghost" onClick={() => viewDoc(s)}>
                          <FileText className="h-3.5 w-3.5" /> Pièce
                        </Button>
                      )}
                      {s.status !== "approved" && (
                        <Button size="sm" onClick={() => approve(s)} className="bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                        </Button>
                      )}
                      {s.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => setRejectOpen(s)}>
                          <XCircle className="h-3.5 w-3.5" /> Rejeter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
