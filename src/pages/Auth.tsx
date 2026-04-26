import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("mode") === "signup" ? "signup" : "signin";
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Récupérer les rôles pour rediriger vers le bon tableau de bord
    let dest = "/";
    if (data.user) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const roles = (rolesData ?? []).map((r) => r.role);
      if (roles.includes("admin")) dest = "/admin";
      else if (roles.includes("vendor")) dest = "/vendor";
    }
    setLoading(false);
    toast.success("Bienvenue sur Madina !");
    nav(dest);
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: String(fd.get("first_name") || ""),
          last_name: String(fd.get("last_name") || ""),
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Vous êtes connecté !");
    nav("/");
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
        <div className="w-full max-w-sm">
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
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="first_name">Prénom</Label><Input id="first_name" name="first_name" required /></div>
                  <div className="space-y-1.5"><Label htmlFor="last_name">Nom</Label><Input id="last_name" name="last_name" required /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="email2">Email</Label><Input id="email2" name="email" type="email" required autoComplete="email" /></div>
                <div className="space-y-1.5"><Label htmlFor="password2">Mot de passe</Label><Input id="password2" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                <Button disabled={loading} className="w-full" size="lg">{loading ? "Création..." : "Créer mon compte"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
