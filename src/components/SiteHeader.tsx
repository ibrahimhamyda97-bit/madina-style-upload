import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, LayoutDashboard, Store, LogOut, User, Menu, X, ShoppingCart, Sparkles, ChevronRight } from "lucide-react";
import madinaLogo from "@/assets/madina-logo.png";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function SiteHeader() {
  const { user, isAdmin, isVendor, isModerator } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/shops", label: "Articles" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    nav("/");
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={madinaLogo} alt="Madina E-Commerce" className="h-11 w-11 object-contain drop-shadow-sm" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">Madina</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Guinée</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "px-3.5 py-2 text-sm font-medium rounded-full transition-smooth",
                  loc.pathname === l.to ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user && !isAdmin && (
              <Button asChild variant="ghost" size="icon" className="relative" aria-label="Panier">
                <Link to="/cart">
                  <ShoppingCart className="h-4.5 w-4.5" />
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                      {count}
                    </span>
                  )}
                </Link>
              </Button>
            )}
            {user ? (
              <>
                {(isAdmin || isModerator || isVendor) ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link to={isAdmin ? "/admin" : isModerator ? "/moderator" : "/vendor"}>
                      <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/account">
                      <LayoutDashboard className="h-4 w-4" /> Mon compte
                    </Link>
                  </Button>
                )}
                <button
                  onClick={() => setOpen(true)}
                  className="h-9 w-9 rounded-full bg-gradient-flag text-white grid place-items-center text-sm font-bold shadow-soft hover:shadow-elegant transition-smooth"
                  aria-label="Mon compte"
                >
                  {initial}
                </button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/auth">Se connecter</Link></Button>
                <Button asChild size="sm" className="rounded-full"><Link to="/auth?mode=signup"><User className="h-4 w-4" /> Créer un compte</Link></Button>
              </>
            )}
          </div>

          {/* Mobile right side: cart + burger */}
          <div className="flex md:hidden items-center gap-1">
            {user && !isAdmin && (
              <Link to="/cart" className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-muted transition-smooth" aria-label="Panier">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                    {count}
                  </span>
                )}
              </Link>
            )}
            <button
              className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted transition-smooth"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer (mobile + account on desktop) */}
      <div
        className={cn(
          "fixed inset-0 z-[60] transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute top-0 right-0 h-full w-[88%] max-w-sm bg-background shadow-elegant flex flex-col transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            {user ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-full bg-gradient-flag text-white grid place-items-center font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm truncate">{user.email}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {isAdmin ? "Administrateur" : isVendor ? "Vendeur" : "Client"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-display font-bold text-base">Bienvenue</p>
                <p className="text-xs text-muted-foreground">Connectez-vous pour acheter</p>
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted shrink-0 ml-2"
              aria-label="Fermer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Body */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <DrawerSectionLabel>Navigation</DrawerSectionLabel>
            {links.map((l) => (
              <DrawerLink key={l.to} to={l.to} icon={Sparkles} label={l.label} active={loc.pathname === l.to} />
            ))}
            {user && (
              <>
                {!isAdmin && (
                  <>
                    <DrawerLink to="/cart" icon={ShoppingCart} label="Mon panier" badge={count > 0 ? count : undefined} active={loc.pathname === "/cart"} />
                    <DrawerLink to="/orders" icon={ShoppingBag} label="Mes commandes" active={loc.pathname === "/orders"} />
                  </>
                )}

                <DrawerSectionLabel>Espace</DrawerSectionLabel>
                {isAdmin && <DrawerLink to="/admin" icon={LayoutDashboard} label="Tableau de bord Admin" />}
                {isVendor && !isAdmin && <DrawerLink to="/vendor" icon={LayoutDashboard} label="Tableau de bord Vendeur" />}
                {!isVendor && !isAdmin && <DrawerLink to="/account" icon={LayoutDashboard} label="Mon compte" />}
                {!isVendor && !isAdmin && <DrawerLink to="/onboarding/shop" icon={Store} label="Ouvrir ma boutique" />}
              </>
            )}

            {!user && (
              <>
                <DrawerSectionLabel>Compte</DrawerSectionLabel>
                <DrawerLink to="/auth" icon={User} label="Se connecter" />
                <DrawerLink to="/auth?mode=signup" icon={User} label="Créer un compte" highlight />
              </>
            )}
          </nav>

          {/* Footer with sign out */}
          {user && (
            <div className="p-4 border-t border-border bg-muted/30">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive hover:text-destructive-foreground transition-smooth"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function DrawerSectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 pt-4 pb-1">{children}</div>;
}

function DrawerLink({
  to, icon: Icon, label, active, badge, highlight,
}: { to: string; icon: any; label: string; active?: boolean; badge?: number; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-smooth group",
        highlight ? "bg-gradient-gold text-secondary-foreground shadow-gold" :
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
