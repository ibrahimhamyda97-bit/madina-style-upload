import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, LayoutDashboard, Store, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function SiteHeader() {
  const { user, isAdmin, isVendor } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "Marketplace" },
    { to: "/shops", label: "Boutiques" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-flag shadow-elegant grid place-items-center overflow-hidden">
            <ShoppingBag className="h-4.5 w-4.5 text-primary-foreground relative z-10" strokeWidth={2.5} />
          </div>
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
          {user ? (
            <>
              {(isAdmin || isVendor) && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={isAdmin ? "/admin" : "/vendor"}>
                    <LayoutDashboard className="h-4 w-4" /> Tableau de bord
                  </Link>
                </Button>
              )}
              {!isVendor && !isAdmin && (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/onboarding/shop"><Store className="h-4 w-4" /> Ouvrir ma boutique</Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Se connecter</Link></Button>
              <Button asChild size="sm" className="rounded-full"><Link to="/auth?mode=signup"><User className="h-4 w-4" /> Créer un compte</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                {(isAdmin || isVendor) && (
                  <Link to={isAdmin ? "/admin" : "/vendor"} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
                    Tableau de bord
                  </Link>
                )}
                {!isVendor && !isAdmin && (
                  <Link to="/onboarding/shop" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
                    Ouvrir ma boutique
                  </Link>
                )}
                <button onClick={handleSignOut} className="text-left px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">
                  Se déconnecter
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted">Se connecter</Link>
                <Link to="/auth?mode=signup" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
