import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckCircle2, XCircle, Clock, Truck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected" | "all";
interface Row {
  id: string;
  title: string;
  price_gnf: number;
  shipping_fee_gnf: number;
  category: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  shop?: { name: string; slug: string; owner_id: string };
}

export default function ProductsList({ scope }: { scope: "vendor" | "admin" }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [tab, setTab] = useState<Status>(scope === "admin" ? "pending" : "all");
  const [shippingEdit, setShippingEdit] = useState<Row | null>(null);
  const [shippingValue, setShippingValue] = useState("");
  const [rejectEdit, setRejectEdit] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    if (!user) return;
    let query = supabase
      .from("products")
      .select("id,title,price_gnf,shipping_fee_gnf,category,created_at,status,rejection_reason, shop:shops(name,slug,owner_id)")
      .order("created_at", { ascending: false });
    if (scope === "vendor") {
      const { data: shops } = await supabase.from("shops").select("id").eq("owner_id", user.id);
      const ids = (shops ?? []).map((s) => s.id);
      if (!ids.length) { setItems([]); return; }
      query = query.in("shop_id", ids);
    }
    const { data } = await query;
    setItems((data ?? []) as any);
  }
  useEffect(() => { load(); }, [user, scope]);

  async function remove(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produit supprimé");
    load();
  }

  async function approve(p: Row) {
    const { error } = await supabase
      .from("products")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id, rejection_reason: null } as any)
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Produit "${p.title}" validé`);
    load();
  }

  async function rejectConfirm() {
    if (!rejectEdit) return;
    const { error } = await supabase
      .from("products")
      .update({ status: "rejected", rejection_reason: rejectReason || "Non conforme" } as any)
      .eq("id", rejectEdit.id);
    if (error) return toast.error(error.message);
    toast.success("Produit rejeté");
    setRejectEdit(null); setRejectReason("");
    load();
  }

  async function saveShipping() {
    if (!shippingEdit) return;
    const v = Math.max(0, Math.floor(Number(shippingValue) || 0));
    const { error } = await supabase
      .from("products")
      .update({ shipping_fee_gnf: v } as any)
      .eq("id", shippingEdit.id);
    if (error) return toast.error(error.message);
    toast.success("Frais de livraison enregistrés");
    setShippingEdit(null);
    load();
  }

  const filtered = tab === "all" ? items : items.filter((p) => p.status === tab);
  const counts = {
    pending: items.filter((p) => p.status === "pending").length,
    approved: items.filter((p) => p.status === "approved").length,
    rejected: items.filter((p) => p.status === "rejected").length,
  };

  const newPath = scope === "vendor" ? "/vendor/products/new" : "/admin/products/new";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground mt-1">{items.length} produit(s)</p>
        </div>
        <Button asChild><Link to={newPath}><Plus className="h-4 w-4" /> Nouveau</Link></Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)} className="mb-5">
        <TabsList>
          {scope === "admin" && (
            <TabsTrigger value="pending">
              <Clock className="h-3.5 w-3.5" /> En attente
              {counts.pending > 0 && <Badge className="ml-2" variant="secondary">{counts.pending}</Badge>}
            </TabsTrigger>
          )}
          <TabsTrigger value="approved"><CheckCircle2 className="h-3.5 w-3.5" /> Validés ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected"><XCircle className="h-3.5 w-3.5" /> Rejetés ({counts.rejected})</TabsTrigger>
          {scope === "vendor" && (
            <TabsTrigger value="pending"><Clock className="h-3.5 w-3.5" /> En attente ({counts.pending})</TabsTrigger>
          )}
          <TabsTrigger value="all">Tous</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">Aucun produit.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Titre</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Boutique</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="text-right px-5 py-3">Prix</th>
                <th className="text-right px-5 py-3 hidden sm:table-cell">Livraison</th>
                <th className="px-5 py-3 w-px"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <Link to={`/product/${p.id}`} className="font-medium hover:text-primary">{p.title}</Link>
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-[11px] text-destructive mt-0.5">Raison : {p.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{p.shop?.name}</td>
                  <td className="px-5 py-3">
                    {p.status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Validé</Badge>}
                    {p.status === "pending" && <Badge variant="secondary">En attente</Badge>}
                    {p.status === "rejected" && <Badge variant="destructive">Rejeté</Badge>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium font-mono">{Number(p.price_gnf).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-3 text-right hidden sm:table-cell">
                    <span className="font-mono text-xs">
                      {Number(p.shipping_fee_gnf ?? 0) > 0
                        ? `${Number(p.shipping_fee_gnf).toLocaleString("fr-FR")} GNF`
                        : <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {scope === "admin" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setShippingEdit(p); setShippingValue(String(p.shipping_fee_gnf ?? 0)); }}>
                            <Truck className="h-3.5 w-3.5" /> Frais
                          </Button>
                          {p.status !== "approved" && (
                            <Button size="sm" onClick={() => approve(p)} className="bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                            </Button>
                          )}
                          {p.status !== "rejected" && (
                            <Button size="sm" variant="outline" onClick={() => { setRejectEdit(p); setRejectReason(""); }}>
                              <XCircle className="h-3.5 w-3.5" /> Rejeter
                            </Button>
                          )}
                        </>
                      )}
                      <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Suppr.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Shipping fee editor (admin) */}
      <Dialog open={!!shippingEdit} onOpenChange={(o) => { if (!o) setShippingEdit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Frais de livraison</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{shippingEdit?.title}</p>
            <Label className="text-xs">Montant (GNF) — par article commandé</Label>
            <Input type="number" min={0} value={shippingValue} onChange={(e) => setShippingValue(e.target.value)} placeholder="0" autoFocus />
            <p className="text-[11px] text-muted-foreground">Mettre 0 pour offrir la livraison.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShippingEdit(null)}>Annuler</Button>
            <Button onClick={saveShipping}><Pencil className="h-3.5 w-3.5" /> Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog (admin) */}
      <Dialog open={!!rejectEdit} onOpenChange={(o) => { if (!o) setRejectEdit(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeter ce produit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{rejectEdit?.title}</p>
            <Label className="text-xs">Raison communiquée au vendeur</Label>
            <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex. Photos floues, description trop courte..." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectEdit(null)}>Annuler</Button>
            <Button variant="destructive" onClick={rejectConfirm}>Confirmer le rejet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
