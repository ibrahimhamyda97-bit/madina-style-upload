import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, UserPlus } from "lucide-react";
import { TEAM_ICONS } from "@/pages/About";

type Member = { id: string; name: string; role: string; icon: string; position: number };

const ICON_OPTIONS = [
  { value: "crown", label: "Couronne (DG)" },
  { value: "shield", label: "Bouclier (Modérateur)" },
  { value: "star", label: "Étoile" },
  { value: "briefcase", label: "Mallette" },
  { value: "award", label: "Médaille" },
  { value: "user", label: "Utilisateur" },
];

export default function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", icon: "user", position: 0 });

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("team_members")
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setMembers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(id: string, patch: Partial<Member>) {
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function save(m: Member) {
    setSaving(m.id);
    const { error } = await (supabase as any)
      .from("team_members")
      .update({ name: m.name, role: m.role, icon: m.icon, position: m.position })
      .eq("id", m.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Membre mis à jour");
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce membre ?")) return;
    const { error } = await (supabase as any).from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Membre supprimé");
    load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      return toast.error("Veuillez remplir le nom et le rôle.");
    }
    setAdding(true);
    const pos = form.position || ((members[members.length - 1]?.position ?? -1) + 1);
    const { error } = await (supabase as any)
      .from("team_members")
      .insert({ name: form.name.trim(), role: form.role.trim(), icon: form.icon, position: pos });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Membre ajouté");
    setForm({ name: "", role: "", icon: "user", position: 0 });
    load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const a = members[idx], b = members[idx + dir];
    if (!a || !b) return;
    await (supabase as any).from("team_members").update({ position: b.position }).eq("id", a.id);
    await (supabase as any).from("team_members").update({ position: a.position }).eq("id", b.id);
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Équipe — page À propos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les noms et rôles affichés dans la section « Notre équipe ».
          </p>
        </div>
        <Button onClick={add} size="sm" className="rounded-full">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun membre. Cliquez sur « Ajouter ».</p>
      ) : (
        <div className="space-y-4">
          {members.map((m, idx) => {
            const cfg = TEAM_ICONS[m.icon] ?? TEAM_ICONS.user;
            const Icon = cfg.icon;
            return (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-background grid place-items-center border shrink-0">
                    <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 flex-1">
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input value={m.name} onChange={(e) => update(m.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Rôle</Label>
                      <Input value={m.role} onChange={(e) => update(m.id, { role: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Icône</Label>
                      <Select value={m.icon} onValueChange={(v) => update(m.id, { icon: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === members.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                  <Button size="sm" onClick={() => save(m)} disabled={saving === m.id}>
                    <Save className="h-4 w-4" /> {saving === m.id ? "…" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
