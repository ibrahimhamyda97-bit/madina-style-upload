import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MyShop() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("shops").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => setShop(data));
  }, [user]);

  if (shop === null) return <div className="text-muted-foreground">Chargement...</div>;
  if (!shop) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground mb-4">Vous n'avez pas encore de boutique.</p>
      <Button asChild><Link to="/onboarding/shop">Créer ma boutique</Link></Button>
    </div>
  );

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("shops").update({
      name: shop.name, description: shop.description, city: shop.city, phone: shop.phone, logo_url: shop.logo_url, banner_url: shop.banner_url,
    }).eq("id", shop.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Boutique mise à jour");
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Ma boutique</h1>
      <p className="text-muted-foreground mb-8">Vue par tous : <Link to={`/shop/${shop.slug}`} className="text-primary hover:underline">/shop/{shop.slug}</Link></p>
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft space-y-4">
        <div className="space-y-1.5"><Label>Nom</Label><Input value={shop.name ?? ""} onChange={(e) => setShop({ ...shop, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Ville</Label><Input value={shop.city ?? ""} onChange={(e) => setShop({ ...shop, city: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Téléphone</Label><Input value={shop.phone ?? ""} onChange={(e) => setShop({ ...shop, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={shop.description ?? ""} onChange={(e) => setShop({ ...shop, description: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Logo (URL)</Label><Input value={shop.logo_url ?? ""} onChange={(e) => setShop({ ...shop, logo_url: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Bannière (URL)</Label><Input value={shop.banner_url ?? ""} onChange={(e) => setShop({ ...shop, banner_url: e.target.value })} /></div>
        <Button onClick={save} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
      </div>
    </div>
  );
}
