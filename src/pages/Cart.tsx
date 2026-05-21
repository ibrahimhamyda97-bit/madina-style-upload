import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function Cart() {
  const { items, total, subtotal, shipping, count, setQuantity, remove, loading } = useCart();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const byShop = useMemo(() => {
    const m: Record<string, { name: string; lines: typeof items; subtotal: number; shipping: number }> = {};
    items.forEach((l) => {
      const sid = l.product.shop?.id ?? "—";
      const name = l.product.shop?.name ?? "Boutique";
      if (!m[sid]) m[sid] = { name, lines: [], subtotal: 0, shipping: 0 };
      m[sid].lines.push(l);
      const unit = l.variant?.price_gnf ?? l.product.price_gnf ?? 0;
      m[sid].subtotal += unit * l.quantity;
      m[sid].shipping += (l.product.shipping_fee_gnf ?? 0) * l.quantity;
    });
    return m;
  }, [items]);

  if (authLoading) {
    return <div className="container max-w-md py-20 text-center text-muted-foreground">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="container max-w-md py-20 text-center animate-fade-in">
        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold">Connectez-vous</h1>
        <p className="text-muted-foreground mt-2">Pour voir votre panier et commander, créez un compte ou connectez-vous.</p>
        <Button asChild size="lg" className="mt-6 rounded-2xl"><Link to="/auth">Se connecter</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Mon panier</h1>
          <p className="text-sm text-muted-foreground">{count} article{count > 1 ? "s" : ""}</p>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-1/2">
            <p className="font-semibold text-sm">Vous avez <strong className="text-primary">{count} article{count > 1 ? "s" : ""}</strong> dans votre panier</p>
            <p className="text-xs text-muted-foreground">Ne les laissez pas filer — finalisez votre commande maintenant !</p>
          </div>
          <Button
            size="sm"
            onClick={() => nav("/checkout")}
            className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold shrink-0 hidden sm:flex"
          >
            Payer maintenant <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="space-y-6">
            {Object.entries(byShop).map(([sid, group]) => (
              <div key={sid} className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <div className="h-7 w-7 rounded-lg bg-gradient-flag" />
                  <p className="font-display font-semibold text-sm">{group.name}</p>
                </div>
                <div className="divide-y divide-border">
                  {group.lines.map((l) => {
                    const variantImg = l.variant?.images?.slice().sort((a: any, b: any) => a.position - b.position)[0]?.image_url;
                    const sized = l.product.images?.find((i: any) => i.size === l.size);
                    const img = variantImg ?? sized?.image_url ?? l.product.images?.[0]?.image_url;
                    const ship = l.product.shipping_fee_gnf ?? 0;
                    const unit = l.variant?.price_gnf ?? l.product.price_gnf;
                    const variantLabel = l.variant
                      ? [l.variant.name, l.variant.color].filter(Boolean).join(" · ")
                      : null;
                    return (
                      <div key={l.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                        <Link to={`/product/${l.product.id}`} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-muted shrink-0">
                          {img ? <img src={img} alt={l.product.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-card" />}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${l.product.id}`} className="font-display font-semibold leading-tight hover:text-primary transition-smooth line-clamp-2">
                            {l.product.title}
                          </Link>
                          {variantLabel && (
                            <p className="text-xs text-muted-foreground mt-1">Variante : <strong className="text-foreground">{variantLabel}</strong></p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Taille : <strong className="text-foreground">{l.size}</strong></p>
                          <p className="font-display text-base font-bold text-primary mt-2">
                            {Number(unit).toLocaleString("fr-FR")} <span className="text-xs text-muted-foreground font-medium">GNF</span>
                          </p>
                          {ship > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              + Livraison <strong className="text-foreground">{ship.toLocaleString("fr-FR")} GNF</strong> / article
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                          <button onClick={() => remove(l.id)} className="text-muted-foreground hover:text-destructive transition-smooth" aria-label="Retirer">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <QtyControl value={l.quantity} onChange={(q) => setQuantity(l.id, q)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {group.shipping > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Livraison de cette boutique</span>
                    <span className="font-medium font-mono">{group.shipping.toLocaleString("fr-FR")} GNF</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sticky summary */}
          <div className="lg:sticky lg:top-24 bg-card border border-border rounded-3xl p-6 shadow-elegant">
            <h2 className="font-display text-lg font-bold">Récapitulatif</h2>
            <div className="space-y-2 mt-4 text-sm">
              <Row label={`Sous-total (${count} article${count > 1 ? "s" : ""})`} value={`${subtotal.toLocaleString("fr-FR")} GNF`} />
              <Row
                label="Livraison"
                value={shipping > 0
                  ? <span className="font-medium">{shipping.toLocaleString("fr-FR")} GNF</span>
                  : <span className="text-muted-foreground">Offerte</span>}
              />
            </div>
            <div className="border-t border-border mt-4 pt-4 flex items-baseline justify-between">
              <span className="font-display font-bold">Total</span>
              <span className="font-display text-2xl font-bold text-primary">
                {total.toLocaleString("fr-FR")} <span className="text-sm font-medium text-muted-foreground">GNF</span>
              </span>
            </div>
            <Button
              size="lg"
              onClick={() => nav("/checkout")}
              className="w-full mt-6 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14 text-base"
            >
              Valider la commande <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Paiement sécurisé via CinetPay (Orange Money, MTN, Moov, Wave).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function QtyControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-1">
      <button onClick={() => onChange(value - 1)} className={cn("h-7 w-7 rounded-full grid place-items-center hover:bg-background transition-smooth", value <= 1 && "opacity-50")}>
        <Minus className="h-3 w-3" />
      </button>
      <span className="text-xs font-bold w-6 text-center">{value}</span>
      <button onClick={() => onChange(value + 1)} className="h-7 w-7 rounded-full grid place-items-center hover:bg-background transition-smooth">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="bg-card border border-dashed border-border rounded-3xl py-16 text-center">
      <div className="inline-flex h-14 w-14 rounded-2xl bg-muted grid place-items-center mb-4">
        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-display text-lg font-semibold">Votre panier est vide</p>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Découvrez nos produits et ajoutez vos coups de cœur.</p>
      <Button asChild size="lg" className="rounded-2xl"><Link to="/shops">Parcourir les boutiques</Link></Button>
    </div>
  );
}
