import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AdminShops() {
  const [shops, setShops] = useState<any[]>([]);
  useEffect(() => { supabase.from("shops").select("id,name,slug,city,created_at").order("created_at", { ascending: false }).then(({ data }) => setShops(data ?? [])); }, []);
  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Boutiques</h1>
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left px-5 py-3">Nom</th><th className="text-left px-5 py-3">Ville</th><th className="text-left px-5 py-3">Slug</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shops.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3"><Link className="font-medium hover:text-primary" to={`/shop/${s.slug}`}>{s.name}</Link></td>
                <td className="px-5 py-3 text-muted-foreground">{s.city}</td>
                <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{s.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
