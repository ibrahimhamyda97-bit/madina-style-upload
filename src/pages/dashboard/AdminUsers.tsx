import { useEffect, useState } from "react";
import { Users, Shield, Store, ShoppingBag, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

const roleMeta: Record<string, { label: string; icon: any; className: string }> = {
  admin: { label: "Admin", icon: Shield, className: "bg-primary/15 text-primary border-primary/30" },
  vendor: { label: "Vendeur", icon: Store, className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  buyer: { label: "Client", icon: ShoppingBag, className: "bg-muted text-muted-foreground border-border" },
};

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, phone, avatar_url, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rolesByUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => {
        rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
      });
      const list: UserRow[] = (profiles ?? []).map((p: any) => ({
        ...p,
        roles: rolesByUser[p.id] ?? [],
      }));
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      (r.first_name ?? "").toLowerCase().includes(term) ||
      (r.last_name ?? "").toLowerCase().includes(term) ||
      (r.phone ?? "").toLowerCase().includes(term) ||
      r.roles.some((role) => role.toLowerCase().includes(term))
    );
  });

  const stats = {
    total: rows.length,
    admins: rows.filter((r) => r.roles.includes("admin")).length,
    vendors: rows.filter((r) => r.roles.includes("vendor")).length,
    buyers: rows.filter((r) => r.roles.includes("buyer")).length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" /> Utilisateurs
        </h1>
        <p className="text-muted-foreground mt-2">Liste de toutes les personnes inscrites sur Madina.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Admins" value={stats.admins} />
        <StatCard label="Vendeurs" value={stats.vendors} />
        <StatCard label="Clients" value={stats.buyers} />
      </div>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom, téléphone, rôle..."
          className="pl-9 h-11 rounded-xl"
        />
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Utilisateur</th>
                  <th className="text-left py-3 px-4 font-medium">Téléphone</th>
                  <th className="text-left py-3 px-4 font-medium">Rôles</th>
                  <th className="text-left py-3 px-4 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
                  const initials = (u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") || "?";
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-flag text-white grid place-items-center text-xs font-bold uppercase shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{fullName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{u.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{u.phone || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            u.roles.map((role) => {
                              const meta = roleMeta[role] ?? { label: role, icon: Users, className: "bg-muted text-muted-foreground border-border" };
                              const Icon = meta.icon;
                              return (
                                <Badge key={role} variant="outline" className={`rounded-full font-medium ${meta.className}`}>
                                  <Icon className="h-3 w-3 mr-1" /> {meta.label}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
