import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Check, Loader2, Phone, MapPin, User as UserIcon, Store, ShieldCheck, Package, CreditCard, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Nom trop court").max(80),
  customer_phone: z.string().trim().min(6, "Téléphone invalide").max(40),
  customer_address: z.string().trim().min(4, "Adresse trop courte").max(300),
  notes: z.string().max(500).optional(),
});

export default function Checkout() {
  const { items, total, subtotal, shipping, refresh } = useCart();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [data, setData] = useState({ customer_name: "", customer_phone: "", customer_address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => { if (!authLoading && !user) nav("/auth"); }, [authLoading, user, nav]);
  useEffect(() => { if (items.length === 0 && !orderRef) nav("/cart"); }, [items, orderRef, nav]);

  // Pre-fill customer info from profile
  useEffect(() => {
    if (!user || profileLoaded) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, city, neighborhood")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        const address = [p.neighborhood, p.city].filter(Boolean).join(", ");
        setData((d) => ({
          customer_name: d.customer_name || fullName,
          customer_phone: d.customer_phone || (p.phone ?? ""),
          customer_address: d.customer_address || address,
          notes: d.notes,
        }));
      }
      setProfileLoaded(true);
    })();
  }, [user, profileLoaded]);

  // Group cart by shop
  const shopGroups = useMemo(() => {
    const m = new Map<string, {
      shopId: string;
      shopName: string;
      itemsSubtotal: number;
      shippingTotal: number;
      subtotal: number;
    }>();
    items.forEach((l) => {
      const sid = l.product.shop?.id ?? "—";
      const itemSub = ((l.variant?.price_gnf ?? l.product?.price_gnf) ?? 0) * l.quantity;
      const shipSub = (l.product?.shipping_fee_gnf ?? 0) * l.quantity;
      const existing = m.get(sid);
      if (existing) {
        existing.itemsSubtotal += itemSub;
        existing.shippingTotal += shipSub;
        existing.subtotal = existing.itemsSubtotal + existing.shippingTotal;
      } else {
        m.set(sid, {
          shopId: sid,
          shopName: l.product.shop?.name ?? "Boutique",
          itemsSubtotal: itemSub,
          shippingTotal: shipSub,
          subtotal: itemSub + shipSub,
        });
      }
    });
    return Array.from(m.values());
  }, [items]);

  async function handlePay() {
    if (!user) return;
    const parsed = schema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setPayLoading(true);

    try {
      const reference = `MAD-${Date.now().toString(36).toUpperCase()}`;
      const { data: orderId, error: orderErr } = await supabase.rpc("place_order", {
        p_reference: reference,
        p_customer_name: parsed.data.customer_name,
        p_customer_phone: parsed.data.customer_phone,
        p_customer_address: parsed.data.customer_address,
        p_notes: parsed.data.notes || null,
        p_payment_operator: "SenePay",
        p_payment_reference: reference,
        p_confirmed_shop_ids: shopGroups.map((g) => g.shopId),
      });

      if (orderErr || !orderId) {
        setPayLoading(false);
        return toast.error(orderErr?.message ?? "Erreur lors de la création de la commande");
      }

      const returnUrl = `${window.location.origin}/orders?senepay=1`;
      const { data: spData, error: spErr } = await supabase.functions.invoke("senepay-initiate", {
        body: { order_id: orderId, return_url: returnUrl },
      });

      if (spErr || !spData?.payment_url) {
        console.error("SenePay init error:", spErr, spData);
        setPayLoading(false);
        return toast.error(spData?.error || "Erreur SenePay. Veuillez réessayer.");
      }

      await refresh();
      window.location.href = spData.payment_url;
    } catch (e) {
      console.error("SenePay flow error:", e);
      setPayLoading(false);
      toast.error("Erreur lors du paiement. Veuillez réessayer.");
    }
  }

  if (orderRef && step === 3) {
    return (
      <div className="container max-w-lg py-16 text-center animate-fade-in">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-5">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Commande envoyée !</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Votre commande <strong className="text-foreground font-mono">{orderRef}</strong> est en attente de validation.
          Madina confirmera la réception de votre paiement et vous contactera.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-8">
          <Button asChild size="lg" variant="outline" className="rounded-2xl"><Link to="/orders">Voir mes commandes</Link></Button>
          <Button asChild size="lg" className="rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold"><Link to="/">Continuer mes achats</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 md:py-12 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/cart"><ArrowLeft className="h-4 w-4" /> Retour au panier</Link>
      </Button>

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">Validation</h1>
      <p className="text-muted-foreground mb-8">Total à payer : <strong className="text-primary font-bold">{total.toLocaleString("fr-FR")} GNF</strong></p>

      <ol className="flex items-center gap-2 mb-8">
        {["Livraison", "Paiement", "Confirmation"].map((label, i) => (
          <li key={label} className="flex-1 flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-smooth shrink-0",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium hidden sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < 2 && <div className={cn("h-0.5 flex-1 rounded-full transition-smooth", i < step ? "bg-primary" : "bg-muted")} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg font-bold">Vos coordonnées de livraison</h2>
            {profileLoaded && (data.customer_name || data.customer_phone) && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                Pré-rempli
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs"><UserIcon className="h-3 w-3" /> Nom complet *</Label>
            <Input value={data.customer_name} onChange={(e) => setData({ ...data, customer_name: e.target.value })} placeholder="Aïssata Diallo" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs"><Phone className="h-3 w-3" /> Téléphone *</Label>
            <Input value={data.customer_phone} onChange={(e) => setData({ ...data, customer_phone: e.target.value })} placeholder="+224 ..." />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3 w-3" /> Adresse de livraison *</Label>
            <Textarea rows={3} value={data.customer_address} onChange={(e) => setData({ ...data, customer_address: e.target.value })} placeholder="Conakry, Kaloum, ..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (optionnel)</Label>
            <Textarea rows={2} value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="Instructions particulières..." />
          </div>
          <Button
            size="lg"
            onClick={() => {
              const parsed = schema.safeParse(data);
              if (!parsed.success) return toast.error(parsed.error.issues[0].message);
              setStep(1);
            }}
            className="w-full rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14"
          >
            Continuer vers le paiement
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          {/* SenePay payment card */}
          <div className="bg-gradient-card border border-primary/30 rounded-3xl p-6 md:p-8 shadow-elegant">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
              <div className="h-11 w-11 rounded-xl bg-primary grid place-items-center text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base">Payer avec SenePay</p>
                <p className="text-xs text-muted-foreground">Mobile Money sécurisé · Orange · MTN</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Montant</p>
                <p className="font-display font-bold text-primary">{total.toLocaleString("fr-FR")} <span className="text-[11px] text-muted-foreground">GNF</span></p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-background/50 p-3">
                <Wallet className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Paiement sécurisé via SenePay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vous serez redirigé vers la page de paiement SenePay pour finaliser votre transaction en toute sécurité.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-background/50 p-3">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Confirmation instantanée</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Après paiement, votre commande est automatiquement validée et vous recevrez un code de livraison.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              disabled={payLoading}
              onClick={handlePay}
              className="w-full mt-6 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14 text-base"
            >
              {payLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Préparation du paiement...</>
              ) : (
                <><ExternalLink className="h-5 w-5" /> Payer {total.toLocaleString("fr-FR")} GNF avec SenePay</>
              )}
            </Button>
          </div>

          {/* Shop summary */}
          {shopGroups.map((g, idx) => (
            <div key={g.shopId} className="bg-card border border-border rounded-3xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-gradient-flag grid place-items-center" />
                  <div className="min-w-1/2">
                    <p className="font-display font-bold text-sm truncate">{g.shopName}</p>
                    <p className="text-[11px] text-muted-foreground">Boutique {idx + 1} sur {shopGroups.length}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Montant</p>
                  <p className="font-display font-bold text-primary text-base">
                    {g.subtotal.toLocaleString("fr-FR")} <span className="text-[10px] text-muted-foreground">GNF</span>
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs">
                {items
                  .filter((l) => (l.product.shop?.id ?? "—") === g.shopId)
                  .map((l) => (
                    <li key={`${l.product.id}-${l.size}`} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">
                        {l.product.title} <span className="text-foreground/60">×{l.quantity}</span>
                        {l.size && <span className="text-foreground/60"> · {l.size}</span>}
                      </span>
                      <span className="font-medium font-mono shrink-0">
                        {(((l.variant?.price_gnf ?? l.product.price_gnf) ?? 0) * l.quantity).toLocaleString("fr-FR")}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(0)} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
