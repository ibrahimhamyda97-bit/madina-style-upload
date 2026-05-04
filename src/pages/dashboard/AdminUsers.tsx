import { useEffect, useState } from "react";
import { Users, Shield, Store, ShoppingBag, Search, Truck, ClipboardCheck, PackageCheck, Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type AppRole = "admin" | "vendor" | "courier" | "buyer" | "moderator" | "order_manager";

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
}

const roleMeta: Record<AppRole, { label: string; icon: any; className: string; desc: string }> = {
  admin: { label: "Admin", icon: Shield, className: "bg-primary/15 text-primary border-primary/30", desc: "Accès total" },
  vendor: { label: "Vendeur", icon: Store, className: "bg-secondary/20 text-secondary-foreground border-secondary/40", desc: "Gère une boutique" },
  courier: { label: "Livreur", icon: Truck, className: "bg-amber-500/15 text-amber-700 border-amber-500/30", desc: "Livre les commandes" },
  moderator: { label: "Modérateur", icon: ClipboardCheck, className: "bg-blue-500/15 text-blue-700 border-blue-500/30", desc: "Modère boutiques & produits" },
  order_manager: { label: "Gest. commandes", icon: PackageCheck, className: "bg-purple-500/15 text-purple-700 border-purple-500/30", desc: "Suit les commandes" },
  buyer: { label: "Client", icon: ShoppingBag, className: "bg-muted text-muted-foreground border-border", desc: "Achète sur le site" },
};

const ASSIGNABLE_ROLES: AppRole[] = ["vendor", "courier", "moderator", "order_manager"];

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, phone, city, neighborhood, avatar_url, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rolesByUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: any) => {
      rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] ?? []), r.role];
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addRole = async (userId: string, role: AppRole) => {
    setBusy(userId + role);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) { setBusy(null); toast.error(error.message); return; }
    // Promotion : retirer le statut "Client" pour que le statut affiché devienne le nouveau rôle
    if (role !== "buyer") {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "buyer");
    }
    setBusy(null);
    toast.success(`Rôle « ${roleMeta[role].label} » attribué — l'utilisateur sera dirigé vers son tableau de bord à la prochaine connexion.`);
    await load();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    setBusy(userId + role);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) { setBusy(null); toast.error(error.message); return; }
    // Si plus aucun rôle spécialisé, restaurer "Client"
    const { data: remaining } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const stillSpecialized = (remaining ?? []).some((r: any) => r.role !== "buyer");
    if (!stillSpecialized && !(remaining ?? []).some((r: any) => r.role === "buyer")) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "buyer" });
    }
    setBusy(null);
    toast.success(`Rôle « ${roleMeta[role].label} » retiré`);
    await load();
  };

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
    couriers: rows.filter((r) => r.roles.includes("courier")).length,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" /> Utilisateurs & Rôles
        </h1>
        <p className="text-muted-foreground mt-2">Attribuez des responsabilités aux membres de votre équipe Madina.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Admins" value={stats.admins} />
        <StatCard label="Vendeurs" value={stats.vendors} />
        <StatCard label="Livreurs" value={stats.couriers} />
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
                  <th className="text-left py-3 px-4 font-medium">Adresse</th>
                  <th className="text-left py-3 px-4 font-medium">Rôles attribués</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
                  const initials = (u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") || "?";
                  const isAdmin = u.roles.includes("admin");
                  const available = ASSIGNABLE_ROLES.filter((r) => !u.roles.includes(r));
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
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{u.phone || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{[u.neighborhood, u.city].filter(Boolean).join(", ") || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            u.roles.map((role) => {
                              const meta = roleMeta[role] ?? roleMeta.buyer;
                              const Icon = meta.icon;
                              const removable = role !== "admin" && role !== "buyer";
                              return (
                                <Badge key={role} variant="outline" className={`rounded-full font-medium ${meta.className} group/role pr-1`}>
                                  <Icon className="h-3 w-3 mr-1" /> {meta.label}
                                  {removable && (
                                    <button
                                      onClick={() => removeRole(u.id, role)}
                                      disabled={busy === u.id + role}
                                      className="ml-1 rounded-full hover:bg-foreground/10 p-0.5 transition-smooth"
                                      title="Retirer ce rôle"
                                    >
                                      {busy === u.id + role ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                    </button>
                                  )}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          <span className="text-[11px] text-muted-foreground italic">Admin exclusif</span>
                        ) : available.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">Tous attribués</span>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline" className="rounded-full">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Attribuer
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 p-2">
                              <p className="text-xs text-muted-foreground px-2 py-1.5">Choisir un rôle à attribuer</p>
                              <div className="space-y-1">
                                {available.map((r) => {
                                  const meta = roleMeta[r];
                                  const Icon = meta.icon;
                                  return (
                                    <button
                                      key={r}
                                      onClick={() => addRole(u.id, r)}
                                      disabled={busy === u.id + r}
                                      className="w-full flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-muted text-left transition-smooth disabled:opacity-50"
                                    >
                                      <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium">{meta.label}</p>
                                        <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                                      </div>
                                      {busy === u.id + r && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
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
