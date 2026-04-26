import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProductsList({ scope }: { scope: "vendor" | "admin" }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    if (!user) return;
    let query = supabase.from("products").select("id,title,price_gnf,category,created_at, shop:shops(name,slug,owner_id)").order("created_at", { ascending: false });
    if (scope === "vendor") {
      const { data: shops } = await supabase.from("shops").select("id").eq("owner_id", user.id);
      const ids = (shops ?? []).map((s) => s.id);
      if (!ids.length) { setItems([]); return; }
      query = query.in("shop_id", ids);
    }
    const { data } = await query;
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, [user, scope]);

  async function remove(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Produit supprimé");
    load();
  }

  const newPath = scope === "vendor" ? "/vendor/products/new" : "/admin/products/new";

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Produits</h1>
          <p className="text-muted-foreground mt-1">{items.length} produit(s)</p>
        </div>
        <Button asChild><Link to={newPath}><Plus className="h-4 w-4" /> Nouveau</Link></Button>
      </div>
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">Aucun produit.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Titre</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Boutique</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Catégorie</th>
                <th className="text-right px-5 py-3">Prix (GNF)</th>
                <th className="px-5 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3"><Link to={`/product/${p.id}`} className="font-medium hover:text-primary">{p.title}</Link></td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{p.shop?.name}</td>
                  <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{p.category}</td>
                  <td className="px-5 py-3 text-right font-medium">{Number(p.price_gnf).toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
