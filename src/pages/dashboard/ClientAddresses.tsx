import { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2, Phone, User as UserIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GUINEA_CITIES, GUINEA_CITY_NAMES } from "@/data/guinea-cities";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal("")),
  recipient_name: z.string().trim().min(2, "Nom trop court").max(80),
  phone: z.string().trim().min(6, "Téléphone invalide").max(40),
  city: z.string().trim().min(2, "Ville requise"),
  neighborhood: z.string().trim().min(2, "Quartier requis"),
  address_extra: z.string().trim().max(200).optional().or(z.literal("")),
});

interface Address {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  city: string;
  neighborhood: string;
  address_extra: string | null;
  is_default: boolean;
}

const empty = {
  label: "",
  recipient_name: "",
  phone: "",
  city: "",
  neighborhood: "",
  address_extra: "",
  is_default: false,
};

export default function ClientAddresses() {
  const { user } = useAuth();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setList((data as Address[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, is_default: list.length === 0 });
    setOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      label: a.label ?? "",
      recipient_name: a.recipient_name,
      phone: a.phone,
      city: a.city,
      neighborhood: a.neighborhood,
      address_extra: a.address_extra ?? "",
      is_default: a.is_default,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const payload = {
      user_id: user.id,
      label: form.label || null,
      recipient_name: form.recipient_name.trim(),
      phone: form.phone.trim(),
      city: form.city,
      neighborhood: form.neighborhood,
      address_extra: form.address_extra || null,
      is_default: form.is_default || list.length === 0,
    };
    const { error } = editing
      ? await supabase.from("user_addresses").update(payload).eq("id", editing.id)
      : await supabase.from("user_addresses").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Adresse mise à jour" : "Adresse enregistrée");
    setOpen(false);
    await load();
  };

  const remove = async (a: Address) => {
    if (!confirm("Supprimer cette adresse ?")) return;
    const { error } = await supabase.from("user_addresses").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Adresse supprimée");
    await load();
  };

  const setDefault = async (a: Address) => {
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Adresse par défaut mise à jour");
    await load();
  };

  const neighborhoods = form.city ? (GUINEA_CITIES[form.city] ?? []) : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <MapPin className="h-7 w-7 text-primary" /> Mes adresses
          </h1>
          <p className="text-muted-foreground mt-2">Enregistrez vos adresses de livraison pour commander plus rapidement.</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold">
          <Plus className="h-4 w-4" /> Nouvelle adresse
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Chargement...</div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center">
          <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-display font-bold">Aucune adresse enregistrée</p>
          <p className="text-sm text-muted-foreground mt-1">Ajoutez une adresse pour gagner du temps au moment du paiement.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((a) => (
            <div key={a.id} className="bg-card border border-border rounded-3xl p-5 shadow-soft relative">
              {a.is_default && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 fill-current" /> Par défaut
                </span>
              )}
              <p className="font-display font-bold text-base">{a.label || "Adresse"}</p>
              <p className="text-sm mt-2 flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> {a.recipient_name}</p>
              <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {a.phone}</p>
              <p className="text-sm text-muted-foreground mt-1">{[a.neighborhood, a.city, a.address_extra].filter(Boolean).join(", ")}</p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                {!a.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => setDefault(a)} className="rounded-xl">
                    <Star className="h-3.5 w-3.5" /> Par défaut
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="rounded-xl">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a)} className="rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'adresse" : "Nouvelle adresse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Libellé (Maison, Bureau...)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Maison" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du destinataire *</Label>
              <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+224 ..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ville *</Label>
                <Select value={form.city} onValueChange={(v) => setForm({ ...form, city: v, neighborhood: "" })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GUINEA_CITY_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quartier *</Label>
                <Select value={form.neighborhood} onValueChange={(v) => setForm({ ...form, neighborhood: v })} disabled={!form.city}>
                  <SelectTrigger><SelectValue placeholder={form.city ? "Choisir" : "Ville d'abord"} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {neighborhoods.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Repère / détails</Label>
              <Input value={form.address_extra} onChange={(e) => setForm({ ...form, address_extra: e.target.value })} placeholder="Près de la pharmacie..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              Définir comme adresse par défaut
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
