import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Smartphone, Check, Copy, Loader2, Phone, MapPin, User as UserIcon } from "lucide-react";
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

const OPERATORS = [
  { id: "orange", name: "Orange Money", color: "bg-[#ff7900]", number: "+224 622 00 00 00" },
  { id: "mtn", name: "MTN Mobile Money", color: "bg-[#ffcc00] text-foreground", number: "+224 660 00 00 00" },
] as const;

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [operator, setOperator] = useState<typeof OPERATORS[number]["id"]>("orange");
  const [data, setData] = useState({ customer_name: "", customer_phone: "", customer_address: "", notes: "" });
  const [paymentReference, setPaymentReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);

  useEffect(() => { if (!user) nav("/auth"); }, [user, nav]);
  useEffect(() => { if (items.length === 0 && !orderRef) nav("/cart"); }, [items, orderRef, nav]);

  const op = useMemo(() => OPERATORS.find((o) => o.id === operator)!, [operator]);

  async function placeOrder() {
    if (!user) return;
    const parsed = schema.safeParse(data);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSubmitting(true);
    const reference = `MAD-${Date.now().toString(36).toUpperCase()}`;
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      reference,
      total_gnf: total,
      payment_method: "mobile_money",
      payment_operator: op.name,
      payment_reference: paymentReference || null,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      customer_address: parsed.data.customer_address,
      notes: parsed.data.notes || null,
      status: "pending",
    }).select().single();

    if (error || !order) { setSubmitting(false); return toast.error(error?.message ?? "Erreur"); }

    const lines = items.map((l) => ({
      order_id: order.id,
      product_id: l.product.id,
      shop_id: l.product.shop?.id,
      title: l.product.title,
      image_url: l.product.images?.find((i: any) => i.size === l.size)?.image_url ?? l.product.images?.[0]?.image_url ?? null,
      size: l.size as any,
      quantity: l.quantity,
      unit_price_gnf: l.product.price_gnf,
      commission_rate: l.product.shop?.commission_rate ?? 10,
    }));
    const { error: liErr } = await supabase.from("order_items").insert(lines);
    if (liErr) { setSubmitting(false); return toast.error(liErr.message); }

    await clear();
    setOrderRef(reference);
    setSubmitting(false);
    setStep(2);
  }

  if (orderRef && step === 2) {
    return (
      <div className="container max-w-lg py-16 text-center animate-fade-in">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-5">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Commande envoyée !</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Votre commande <strong className="text-foreground font-mono">{orderRef}</strong> est en attente de validation.
          Madina confirmera la réception de votre paiement {op.name} et vous contactera.
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
              "h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition-smooth",
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
          <h2 className="font-display text-lg font-bold mb-2">Vos coordonnées de livraison</h2>
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
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-soft">
            <h2 className="font-display text-lg font-bold mb-1">Choisir un opérateur</h2>
            <p className="text-sm text-muted-foreground mb-5">Effectuez le paiement depuis votre application Mobile Money.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {OPERATORS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOperator(o.id)}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition-smooth flex items-center gap-3",
                    operator === o.id ? "border-primary shadow-soft bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn("h-10 w-10 rounded-xl grid place-items-center text-white", o.color)}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground">Paiement instantané</p>
                  </div>
                  {operator === o.id && <Check className="h-5 w-5 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-card border border-primary/30 rounded-3xl p-6 md:p-8 shadow-elegant">
            <h3 className="font-display text-base font-bold mb-3">Étapes de paiement</h3>
            <ol className="space-y-3 text-sm">
              <PayStep n={1} text={<>Ouvrez votre application <strong>{op.name}</strong>.</>} />
              <PayStep
                n={2}
                text={
                  <div className="space-y-2">
                    <span>Envoyez <strong className="text-primary">{total.toLocaleString("fr-FR")} GNF</strong> au numéro Madina :</span>
                    <CopyRow value={op.number} />
                  </div>
                }
              />
              <PayStep
                n={3}
                text={
                  <div className="space-y-2">
                    <span>Saisissez la référence reçue après le transfert :</span>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Ex. OM-1234567"
                      className="rounded-xl"
                    />
                  </div>
                }
              />
            </ol>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(0)} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button
              size="lg"
              disabled={submitting}
              onClick={placeOrder}
              className="flex-1 rounded-2xl bg-gradient-gold text-secondary-foreground shadow-gold h-14 text-base"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Validation...</> : "J'ai effectué le paiement"}
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

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border w-full text-left hover:border-primary transition-smooth"
    >
      <code className="font-mono text-sm font-bold flex-1">{value}</code>
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}
