import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Plus, Store, ArrowLeft, Users, Wallet, ShoppingBag, ShoppingCart, User, TrendingUp, Truck, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Item { to: string; label: string; icon: any; end?: boolean }

export default function DashboardShell({ items, title }: { items: Item[]; title: string }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-card/40 lg:py-8 px-4 py-4">
        <div className="hidden lg:flex items-center gap-2 mb-8 px-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-flag" />
          <div>
            <p className="font-display font-bold text-sm leading-none">{title}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Madina</p>
          </div>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth whitespace-nowrap",
                isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="hidden lg:flex items-center gap-2 px-3 py-2.5 mt-8 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à la marketplace
        </Link>
      </aside>
      <main className="p-5 md:p-10 bg-background">
        <Outlet />
      </main>
    </div>
  );
}

export const vendorNav: Item[] = [
  { to: "/vendor", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/vendor/products", label: "Produits", icon: Package },
  { to: "/vendor/products/new", label: "Ajouter", icon: Plus },
  { to: "/vendor/sales", label: "Mes ventes", icon: TrendingUp },
  { to: "/vendor/shop", label: "Ma boutique", icon: Store },
];

export const adminNav: Item[] = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Commandes", icon: ShoppingBag },
  { to: "/admin/finance", label: "Finance", icon: Wallet },
  { to: "/admin/products", label: "Produits", icon: Package },
  { to: "/admin/products/new", label: "Ajouter", icon: Plus },
  { to: "/admin/shops", label: "Boutiques", icon: Store },
  { to: "/admin/couriers", label: "Demandes livreurs", icon: Truck },
  { to: "/admin/users", label: "Utilisateurs", icon: Users },
];

export const moderatorNav: Item[] = [
  { to: "/moderator", label: "Commandes", icon: ShoppingBag, end: true },
  { to: "/moderator/shops", label: "Boutiques", icon: Store },
  { to: "/moderator/couriers", label: "Demandes livreurs", icon: Truck },
  { to: "/moderator/users", label: "Utilisateurs", icon: Users },
];

export const clientNav: Item[] = [
  { to: "/account", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
  { to: "/account/profile", label: "Mon profil", icon: User },
  { to: "/account/cart", label: "Mon panier", icon: ShoppingCart },
  { to: "/account/orders", label: "Mes commandes", icon: ShoppingBag },
];

export const courierNav: Item[] = [
  { to: "/courier", label: "Livraisons", icon: Truck, end: true },
  { to: "/account/profile", label: "Mon profil", icon: User },
];
