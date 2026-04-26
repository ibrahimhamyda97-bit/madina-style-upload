import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag, User, Store, Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AccountType = "buyer" | "shop" | "courier";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("mode") === "signup" ? "signup" : "signin";
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("buyer");

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    let dest = "/account";
    if (data.user) {
      const [{ data: rolesData }, { data: shopsData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
        supabase.from("shops").select("id").eq("owner_id", data.user.id).limit(1),
      ]);
      const roles = (rolesData ?? []).map((r) => r.role);
      const hasShop = (shopsData ?? []).length > 0;
      if (roles.includes("admin")) dest = "/admin";
      else if (roles.includes("courier")) dest = "/courier";
      else if (roles.includes("vendor") || hasShop) dest = "/vendor";
    }
    setLoading(false);
    toast.success("Bienvenue sur Madina !");
    nav(dest, { replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const first_name = String(fd.get("first_name") || "");
    const last_name = String(fd.get("last_name") || "");
    const phone = String(fd.get("phone") || "");
    const city = String(fd.get("city") || "");
    const neighborhood = String(fd.get("neighborhood") || "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name, last_name },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (!data.user) { setLoading(false); return toast.error("Erreur inconnue"); }

    // Mettre à jour le profil avec téléphone/ville/quartier
    await supabase.from("profiles").update({
      first_name, last_name, phone, city, neighborhood,
    }).eq("id", data.user.id);

    if (accountType === "courier") {
      const { error: roleErr } = await supabase.rpc("assign_courier_role");
      if (roleErr) { setLoading(false); return toast.error(roleErr.message); }
    }

    setLoading(false);
    toast.success("Compte créé avec succès !");

    if (accountType === "shop") nav("/onboarding/shop");
    else if (accountType === "courier") nav("/courier");
    else nav("/account");
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute -bottom-px left-0 right-0 h-1 bg-gradient-flag" />
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <ShoppingBag className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold">Madina</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Le marché de Madina,<br/>réinventé pour vous.</h2>
          <p className="mt-4 text-primary-foreground/80">Achetez, vendez, et faites grandir votre boutique avec les outils les plus modernes de Guinée.</p>
        </div>
        <p className="text-xs text-primary-foreground/60 relative z-10">© Madina — Conakry, Guinée</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-2xl font-bold mb-1">Bienvenue</h1>
          <p className="text-muted-foreground text-sm mb-8">Connectez-vous ou créez votre compte Madina.</p>
          <Tabs defaultValue={initialTab}>
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="signin">Se connecter</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5"><Label htmlFor="password">Mot de passe</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
                <Button disabled={loading} className="w-full" size="lg">{loading ? "Connexion..." : "Se connecter"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {/* Type de compte */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <AccountCard
                  selected={accountType === "buyer"}
                  onClick={() => setAccountType("buyer")}
                  icon={<User className="h-5 w-5" />}
                  title="Client"
                  desc="Acheter"
                />
                <AccountCard
                  selected={accountType === "shop"}
                  onClick={() => setAccountType("shop")}
                  icon={<Store className="h-5 w-5" />}
                  title="Boutique"
                  desc="Vendre"
                />
                <AccountCard
                  selected={accountType === "courier"}
                  onClick={() => setAccountType("courier")}
                  icon={<Truck className="h-5 w-5" />}
                  title="Livreur"
                  desc="Livrer"
                />
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="first_name">Prénom</Label><Input id="first_name" name="first_name" required /></div>
                  <div className="space-y-1.5"><Label htmlFor="last_name">Nom</Label><Input id="last_name" name="last_name" required /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="email2">Email</Label><Input id="email2" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5"><Label htmlFor="password2">Mot de passe</Label><Input id="password2" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Téléphone *</Label><Input id="phone" name="phone" type="tel" required placeholder="+224 ..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="city">Ville *</Label><Input id="city" name="city" required placeholder="Conakry" /></div>
                  <div className="space-y-1.5"><Label htmlFor="neighborhood">Quartier *</Label><Input id="neighborhood" name="neighborhood" required placeholder="Madina" /></div>
                </div>

                {accountType === "shop" && (
                  <div className="rounded-xl bg-secondary/10 border border-secondary/30 p-3 text-xs text-muted-foreground">
                    <Store className="inline h-3.5 w-3.5 mr-1 text-secondary" />
                    Après inscription, vous renseignerez les infos de votre boutique et téléverserez votre pièce d'identité pour validation par l'admin.
                  </div>
                )}
                {accountType === "courier" && (
                  <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-xs text-muted-foreground">
                    <Truck className="inline h-3.5 w-3.5 mr-1 text-primary" />
                    En tant que livreur, vous verrez les commandes payées à récupérer chez les vendeurs et à livrer aux clients.
                  </div>
                )}

                <Button disabled={loading} className="w-full" size="lg">
                  {loading
                    ? "Création..."
                    : accountType === "shop"
                      ? "Continuer vers ma boutique"
                      : accountType === "courier"
                        ? "Créer mon compte livreur"
                        : "Créer mon compte client"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ selected, onClick, icon, title, desc }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative text-left p-4 rounded-2xl border-2 transition-smooth",
        selected
          ? "border-primary bg-primary/5 shadow-soft"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <div className={cn("h-9 w-9 rounded-xl grid place-items-center mb-2", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <p className="font-display font-bold text-sm">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      {selected && (
        <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
