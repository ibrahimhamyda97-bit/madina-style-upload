import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, MapPin, Phone, Save, Loader2 } from "lucide-react";

export default function ClientProfile() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", city: "", neighborhood: "" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/auth"); return; }
    supabase.from("profiles").select("first_name,last_name,phone,city,neighborhood").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          first_name: data.first_name || "", last_name: data.last_name || "",
          phone: data.phone || "", city: data.city || "", neighborhood: data.neighborhood || "",
        });
        setLoading(false);
      });
  }, [user, authLoading, nav]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil mis à jour");
  }

  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground mt-1">Gérez vos informations personnelles et de livraison.</p>
      </div>

      <form onSubmit={save} className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="h-14 w-14 rounded-full bg-gradient-flag text-white grid place-items-center font-bold text-lg">
            {(form.first_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Compte client</p>
          </div>
        </div>

        <Section icon={<User className="h-4 w-4" />} title="Identité">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Prénom *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
          </div>
        </Section>

        <Section icon={<Phone className="h-4 w-4" />} title="Contact">
          <div className="space-y-1.5"><Label>Téléphone *</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+224 ..." required /></div>
        </Section>

        <Section icon={<MapPin className="h-4 w-4" />} title="Livraison">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Ville *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Conakry" required /></div>
            <div className="space-y-1.5"><Label>Quartier *</Label><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Madina" required /></div>
          </div>
        </Section>

        <Button type="submit" disabled={saving} className="w-full md:w-auto md:px-8 bg-gradient-gold text-secondary-foreground shadow-gold">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Save className="h-4 w-4" /> Enregistrer</>}
        </Button>
      </form>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{icon}<span>{title}</span></div>
      {children}
    </div>
  );
}
