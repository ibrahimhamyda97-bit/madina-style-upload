import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Smartphone, Check, Copy, Loader2, Phone, MapPin, User as UserIcon, Hash, Store, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const FALLBACK_OPERATORS = [
  { id: "orange", name: "Orange Money", color: "bg-[#ff7900]", number: "+224 622 00 00 00" },
  { id: "mtn", name: "MTN Mobile Money", color: "bg-[#ffcc00] text-foreground", number: "+224 660 00 00 00" },
] as const;

function operatorMeta(name?: string | null) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("orange")) return { id: "orange", name: "Orange Money", color: "bg-[#ff7900]" };
  if (n.includes("mtn")) return { id: "mtn", name: "MTN Mobile Money", color: "bg-[#ffcc00] text-foreground" };
  return { id: "other", name: name || "Mobile Money", color: "bg-primary" };
}

export default function Checkout() {
  const { items, total, subtotal, shipping, refresh } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [data, setData] = useState({ customer_name: "", customer_phone: "", customer_address: "", notes: "" });
  const [paymentReference, setPaymentReference] = useState(
    () => `MAD-${Date.now().toString(36).toUpperCase()}`
  );
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [confirmedByShop, setConfirmedByShop] = useState<Record<string, boolean>>({});

  useEffect(() => { if (!user) nav("/auth"); }, [user, nav]);
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

  // Group cart by shop with each shop's payment info
  const shopGroups = useMemo(() => {
    const m = new Map<string, {
      shopId: string;
      shopName: string;
      operatorName: string;
      paymentNumber: string;
      itemsSubtotal: number;
      shippingTotal: number;
      subtotal: number; // itemsSubtotal + shippingTotal — what to send via mobile money
      meta: ReturnType<typeof operatorMeta>;
    }>();
    items.forEach((l) => {
      const sid = l.product.shop?.id ?? "—";
      const itemSub = (l.product?.price_gnf ?? 0) * l.quantity;
      const shipSub = (l.product?.shipping_fee_gnf ?? 0) * l.quantity;
      const existing = m.get(sid);
      if (existing) {
        existing.itemsSubtotal += itemSub;
        existing.shippingTotal += shipSub;
        existing.subtotal = existing.itemsSubtotal + existing.shippingTotal;
      } else {
        const operatorName = l.product.shop?.payment_operator || FALLBACK_OPERATORS[0].name;
        const paymentNumber = l.product.shop?.payment_number || FALLBACK_OPERATORS[0].number;
        m.set(sid, {
          shopId: sid,
          shopName: l.product.shop?.name ?? "Boutique",
          operatorName,
          paymentNumber,
          itemsSubtotal: itemSub,
          shippingTotal: shipSub,
          subtotal: itemSub + shipSub,
          meta: operatorMeta(operatorName),
        });
      }
    });
    return Array.from(m.values());
  }, [items]);

  const primary = shopGroups[0];
  const allConfirmed = shopGroups.length > 0 && shopGroups.every((g) => confirmedByShop[g.shopId]);

  async function placeOrder() {
    if (!user) return;
    const parsed = schema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!allConfirmed) return toast.error("Confirmez le paiement de chaque boutique");

    setSubmitting(true);
    const reference = paymentReference || `MAD-${Date.now().toString(36).toUpperCase()}`;
    const confirmedIds = shopGroups
      .filter((g) => confirmedByShop[g.shopId])
      .map((g) => g.shopId);

    const { data: orderId, error } = await supabase.rpc("place_order", {
      p_reference: reference,
      p_customer_name: parsed.data.customer_name,
      p_customer_phone: parsed.data.customer_phone,
      p_customer_address: parsed.data.customer_address,
      p_notes: parsed.data.notes || null,
      p_payment_operator: primary?.operatorName ?? "Mobile Money",
      p_payment_reference: reference,
      p_confirmed_shop_ids: confirmedIds,
    });

    if (error || !orderId) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Erreur lors de la validation");
    }

    await refresh();
    setOrderRef(reference);
    setSubmitting(false);
    setStep(3);
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
        {["Livraison", "Paiement", "Vérification", "Confirmation"].map((label, i) => (
          <li key={label} className="flex-1 flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-smooth shrink-0",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium hidden sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < 3 && <div className={cn("h-0.5 flex-1 rounded-full transition-smooth", i < step ? "bg-primary" : "bg-muted")} />}
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
          {shopGroups.length > 1 && (
            <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4 text-sm">
              <p className="font-semibold mb-1">⚠️ Plusieurs boutiques dans votre panier</p>
              <p className="text-muted-foreground text-xs">Effectuez un paiement séparé vers le numéro de chaque boutique ci-dessous.</p>
            </div>
          )}

          {shopGroups.map((g) => (
            <div key={g.shopId} className="bg-gradient-card border border-primary/30 rounded-3xl p-6 md:p-8 shadow-elegant">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                <div className={cn("h-11 w-11 rounded-xl grid place-items-center text-white", g.meta.color)}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-base flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    {g.shopName}
                  </p>
                  <p className="text-xs text-muted-foreground">Paiement via <strong>{g.meta.name}</strong></p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Montant</p>
                  <p className="font-display font-bold text-primary">{g.subtotal.toLocaleString("fr-FR")} <span className="text-[11px] text-muted-foreground">GNF</span></p>
                  {g.shippingTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      dont {g.shippingTotal.toLocaleString("fr-FR")} livraison
                    </p>
                  )}
                </div>
              </div>

              <ol className="space-y-4 text-sm">
                <PayStep n={1} text={<>Ouvrez votre application <strong>{g.meta.name}</strong> sur votre téléphone.</>} />
                <PayStep
                  n={2}
                  text={
                    <div className="space-y-2">
                      <span>Envoyez <strong className="text-primary">{g.subtotal.toLocaleString("fr-FR")} GNF</strong> au numéro :</span>
                      <CopyRow value={g.paymentNumber} icon={<Phone className="h-3.5 w-3.5" />} />
                    </div>
                  }
                />
                <PayStep
                  n={3}
                  text={
                    <div className="space-y-2">
                      <span>Indiquez la référence ci-dessous comme motif du transfert :</span>
                      <CopyRow value={paymentReference} icon={<Hash className="h-3.5 w-3.5" />} highlight />
                    </div>
                  }
                />
              </ol>
            </div>
          ))}

          <div className="bg-card border border-border rounded-3xl p-5">
            <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
              <Hash className="h-3 w-3" /> Référence du transfert (optionnel)
            </Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="MAD-XXXXXX"
              className="rounded-xl font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              La référence est pré-générée. Vous pouvez la modifier avec celle reçue de l'opérateur après le transfert.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(0)} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button
              size="lg"
              onClick={() => setStep(2)}
              className="flex-1 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14 text-base"
            >
              <ShieldCheck className="h-4 w-4" /> Vérifier ma commande
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Dernière vérification</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Confirmez les informations de paiement boutique par boutique avant de valider votre commande.
              </p>
            </div>
          </div>

          {/* Livraison */}
          <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Livraison
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setStep(0)} className="h-7 text-xs">Modifier</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <SummaryRow label="Nom" value={data.customer_name} />
              <SummaryRow label="Téléphone" value={data.customer_phone} />
              <SummaryRow label="Adresse" value={data.customer_address} className="sm:col-span-2" />
              {data.notes && <SummaryRow label="Note" value={data.notes} className="sm:col-span-2" />}
            </div>
          </div>

          {/* Récap par boutique */}
          {shopGroups.map((g, idx) => (
            <div key={g.shopId} className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("h-9 w-9 rounded-xl grid place-items-center text-white shrink-0", g.meta.color)}>
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
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

              <div className="space-y-2.5">
                <SummaryLine icon={<Smartphone className="h-3.5 w-3.5" />} label="Opérateur" value={g.meta.name} />
                <SummaryLine icon={<Phone className="h-3.5 w-3.5" />} label="Numéro" value={g.paymentNumber} mono />
                <SummaryLine icon={<Hash className="h-3.5 w-3.5" />} label="Référence" value={paymentReference} mono highlight />
              </div>

              {/* Articles de la boutique */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> Articles
                </p>
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
                          {((l.product.price_gnf ?? 0) * l.quantity).toLocaleString("fr-FR")}
                        </span>
                      </li>
                    ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-dashed border-border space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total articles</span>
                    <span className="font-mono">{g.itemsSubtotal.toLocaleString("fr-FR")} GNF</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span className="font-mono">
                      {g.shippingTotal > 0 ? `${g.shippingTotal.toLocaleString("fr-FR")} GNF` : "Offerte"}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1">
                    <span>Total à transférer</span>
                    <span className="font-mono text-primary">{g.subtotal.toLocaleString("fr-FR")} GNF</span>
                  </div>
                </div>
              </div>

              {/* Confirmation par boutique */}
              <label className={cn(
                "mt-4 flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-smooth",
                confirmedByShop[g.shopId]
                  ? "bg-primary/5 border-primary/40"
                  : "bg-muted/30 border-border hover:border-primary/40"
              )}>
                <Checkbox
                  checked={!!confirmedByShop[g.shopId]}
                  onCheckedChange={(v) => setConfirmedByShop((prev) => ({ ...prev, [g.shopId]: v === true }))}
                  className="mt-0.5"
                />
                <span className="text-xs text-foreground">
                  J'ai effectué le paiement de <strong>{g.subtotal.toLocaleString("fr-FR")} GNF</strong> à <strong>{g.shopName}</strong> via {g.meta.name}.
                </span>
              </label>
            </div>
          ))}

          {/* Total */}
          <div className="bg-gradient-gold text-secondary-foreground rounded-3xl p-5 shadow-gold space-y-1">
            <div className="flex items-center justify-between text-xs opacity-80">
              <span>Articles</span>
              <span className="font-mono">{subtotal.toLocaleString("fr-FR")} GNF</span>
            </div>
            <div className="flex items-center justify-between text-xs opacity-80">
              <span>Livraison</span>
              <span className="font-mono">{shipping > 0 ? `${shipping.toLocaleString("fr-FR")} GNF` : "Offerte"}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-secondary-foreground/20">
              <span className="font-display font-bold text-base">Total à payer</span>
              <span className="font-display font-bold text-2xl">{total.toLocaleString("fr-FR")} <span className="text-sm opacity-70">GNF</span></span>
            </div>
          </div>

          {!allConfirmed && (
            <p className="text-xs text-muted-foreground text-center">
              Cochez la confirmation pour <strong>chaque boutique</strong> avant de valider.
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(1)} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button
              size="lg"
              disabled={submitting || !allConfirmed}
              onClick={placeOrder}
              className="flex-1 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14 text-base"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Validation...</> : <>Valider ma commande <Check className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PayStep({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">{n}</div>
      <div className="flex-1 pt-0.5">{text}</div>
    </li>
  );
}

function CopyRow({ value, icon, highlight }: { value: string; icon?: React.ReactNode; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Copié !"); }}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-xl border w-full text-left transition-smooth",
        highlight ? "bg-primary/5 border-primary/40 hover:border-primary" : "bg-background border-border hover:border-primary"
      )}
    >
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <code className={cn("font-mono text-sm font-bold flex-1 truncate", highlight && "text-primary")}>{value}</code>
      {copied ? <Check className="h-4 w-4 text-primary shrink-0" /> : <Copy className="h-4 w-4 text-muted-foreground shrink-0" />}
    </button>
  );
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

function SummaryLine({
  icon, label, value, mono, highlight,
}: { icon: React.ReactNode; label: string; value: string; mono?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className={cn("text-sm flex-1 truncate", mono && "font-mono font-bold", highlight && "text-primary")}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success("Copié !"); }}
        className="h-7 w-7 rounded-lg grid place-items-center hover:bg-muted transition-smooth shrink-0"
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}
