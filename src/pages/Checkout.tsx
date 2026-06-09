import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Check, Loader2, Phone, MapPin, User as UserIcon, Store, ShieldCheck, Package, CreditCard, Wallet, ExternalLink, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import orangeMoneyLogo from "@/assets/orange-money.png";
import mtnMomoLogo from "@/assets/mtn-momo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GUINEA_CITIES, GUINEA_CITY_NAMES } from "@/data/guinea-cities";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Nom trop court").max(80),
  customer_phone: z.string().trim().min(6, "Téléphone invalide").max(40),
  customer_city: z.string().trim().min(2, "Ville requise").max(60),
  customer_neighborhood: z.string().trim().min(2, "Quartier requis").max(80),
  customer_address_extra: z.string().trim().max(200).optional(),
  notes: z.string().max(500).optional(),
});

type PaymentChannel = "ORANGE_MONEY" | "MTN_MOMO";

export default function Checkout() {
  const { items, total, subtotal, shipping, refresh, loading: cartLoading } = useCart();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [data, setData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_city: "",
    customer_neighborhood: "",
    customer_address_extra: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>("ORANGE_MONEY");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);

  const neighborhoods = data.customer_city ? (GUINEA_CITIES[data.customer_city] ?? []) : [];

  useEffect(() => { if (!authLoading && !user) nav("/auth"); }, [authLoading, user, nav]);
  useEffect(() => {
    if (authLoading || cartLoading) return;
    if (!user) return;
    if (items.length === 0 && !orderRef && !payLoading) nav("/cart");
  }, [authLoading, cartLoading, user, items, orderRef, payLoading, nav]);

  // Pre-fill from saved addresses; fall back to profile
  useEffect(() => {
    if (!user || profileLoaded) return;
    (async () => {
      const [{ data: addrs }, { data: p }] = await Promise.all([
        supabase
          .from("user_addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("first_name, last_name, phone, city, neighborhood")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const addresses = (addrs ?? []) as any[];
      setSavedAddresses(addresses);

      if (addresses.length > 0) {
        const pick = addresses.find((a) => a.is_default) ?? addresses[0];
        applyAddress(pick);
        setSelectedAddressId(pick.id);
      } else if (p) {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        const city = p.city && GUINEA_CITIES[p.city] ? p.city : "";
        const hood = city && p.neighborhood && GUINEA_CITIES[city]?.includes(p.neighborhood) ? p.neighborhood : "";
        setData((d) => ({
          ...d,
          customer_name: d.customer_name || fullName,
          customer_phone: d.customer_phone || (p.phone ?? ""),
          customer_city: d.customer_city || city,
          customer_neighborhood: d.customer_neighborhood || hood,
        }));
        setSelectedAddressId("new");
      }
      setProfileLoaded(true);
    })();
  }, [user, profileLoaded]);

  function applyAddress(a: any) {
    setData((d) => ({
      ...d,
      customer_name: a.recipient_name,
      customer_phone: a.phone,
      customer_city: GUINEA_CITIES[a.city] ? a.city : "",
      customer_neighborhood: GUINEA_CITIES[a.city]?.includes(a.neighborhood) ? a.neighborhood : "",
      customer_address_extra: a.address_extra ?? "",
    }));
  }

  function handleSelectAddress(id: string) {
    setSelectedAddressId(id);
    if (id === "new") {
      setData((d) => ({
        ...d,
        customer_name: "",
        customer_phone: "",
        customer_city: "",
        customer_neighborhood: "",
        customer_address_extra: "",
      }));
      return;
    }
    const a = savedAddresses.find((x) => x.id === id);
    if (a) applyAddress(a);
  }

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
      const operatorLabel = paymentChannel === "ORANGE_MONEY" ? "Orange Money" : "MTN MoMo";
      const { data: orderId, error: orderErr } = await supabase.rpc("place_order", {
        p_reference: reference,
        p_customer_name: parsed.data.customer_name,
        p_customer_phone: parsed.data.customer_phone,
        p_customer_address: [parsed.data.customer_neighborhood, parsed.data.customer_city, parsed.data.customer_address_extra].filter(Boolean).join(", "),
        p_notes: parsed.data.notes || null,
        p_payment_operator: operatorLabel,
        p_payment_reference: reference,
        p_confirmed_shop_ids: shopGroups.map((g) => g.shopId),
      });

      if (orderErr || !orderId) {
        setPayLoading(false);
        return toast.error(orderErr?.message ?? "Erreur lors de la création de la commande");
      }

      // Persist new address if user opted in
      if (saveAddress && selectedAddressId === "new") {
        await supabase.from("user_addresses").insert({
          user_id: user.id,
          recipient_name: parsed.data.customer_name,
          phone: parsed.data.customer_phone,
          city: parsed.data.customer_city,
          neighborhood: parsed.data.customer_neighborhood,
          address_extra: parsed.data.customer_address_extra || null,
          is_default: savedAddresses.length === 0,
        });
      }

      // Lock orderRef so the empty-cart redirect doesn't fire after cart is cleared
      setOrderRef(reference);

      const returnUrl = `${window.location.origin}/orders?senepay=1`;
      const { data: spData, error: spErr } = await supabase.functions.invoke("senepay-initiate", {
        body: { order_id: orderId, return_url: returnUrl, payment_channel: paymentChannel },
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3 w-3" /> Ville *</Label>
              <Select
                value={data.customer_city}
                onValueChange={(v) => setData({ ...data, customer_city: v, customer_neighborhood: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {GUINEA_CITY_NAMES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3 w-3" /> Quartier / Commune *</Label>
              <Select
                value={data.customer_neighborhood}
                onValueChange={(v) => setData({ ...data, customer_neighborhood: v })}
                disabled={!data.customer_city}
              >
                <SelectTrigger>
                  <SelectValue placeholder={data.customer_city ? "Choisir un quartier" : "Sélectionnez d'abord la ville"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {neighborhoods.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Repère / détails (optionnel)</Label>
            <Input
              value={data.customer_address_extra}
              onChange={(e) => setData({ ...data, customer_address_extra: e.target.value })}
              placeholder="Ex : à côté de la pharmacie centrale, immeuble bleu..."
            />
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
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                  Choisissez votre opérateur Mobile Money
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: "ORANGE_MONEY" as const, label: "Orange Money", logo: orangeMoneyLogo },
                    { id: "MTN_MOMO" as const, label: "MTN MoMo", logo: mtnMomoLogo },
                  ]).map((op) => {
                    const active = paymentChannel === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setPaymentChannel(op.id)}
                        aria-pressed={active}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-background/50 p-4 transition-smooth",
                          active
                            ? "border-primary shadow-elegant"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {active && (
                          <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                        <img
                          src={op.logo}
                          alt={`Logo ${op.label}`}
                          loading="lazy"
                          width={1024}
                          height={1024}
                          className="h-14 w-14 object-contain"
                        />
                        <span className="text-xs font-semibold">{op.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-background/50 p-3">
                <Wallet className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Paiement sécurisé via SenePay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vous serez redirigé vers la page de paiement SenePay pour finaliser votre transaction avec {paymentChannel === "ORANGE_MONEY" ? "Orange Money" : "MTN MoMo"}.
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
                <><ExternalLink className="h-5 w-5" /> Payer {total.toLocaleString("fr-FR")} GNF</>
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
