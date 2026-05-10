import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const CART_CACHE_KEY = "madina-cart";

export interface CartLine {
  id: string;
  product_id: string;
  variant_id: string | null;
  size: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price_gnf: number;
    shipping_fee_gnf: number;
    shop_id: string;
    shop?: { id: string; name: string; slug: string; commission_rate: number; payment_operator: string | null; payment_number: string | null };
    images: { image_url: string; size: string }[];
  };
  variant?: {
    id: string;
    name: string | null;
    color: string | null;
    size: string | null;
    price_gnf: number | null;
    images: { image_url: string; position: number }[];
  } | null;
}

type CachedCartByUser = Record<string, CartLine[]>;

function cacheKey(userId: string | null) {
  return userId ? userId : "guest";
}

function readCachedCart(userId: string | null): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const cache = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "{}") as CachedCartByUser;
    return cache[cacheKey(userId)] ?? [];
  } catch {
    return [];
  }
}

function writeCachedCart(userId: string | null, nextItems: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    const cache = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "{}") as CachedCartByUser;
    cache[cacheKey(userId)] = nextItems;
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // LocalStorage can fail in private mode; the in-memory cart still works.
  }
}

async function hydrateCartLine(cartRow: { id: string; product_id: string; variant_id: string | null; size: string; quantity: number }) {
  const [{ data: product }, { data: variant }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, title, price_gnf, shipping_fee_gnf, shop_id,
        shop:shops(id, name, slug, commission_rate, payment_operator, payment_number),
        images:product_images(image_url, size)
      `)
      .eq("id", cartRow.product_id)
      .maybeSingle(),
    cartRow.variant_id
      ? supabase
          .from("product_variants")
          .select("id, name, color, size, price_gnf, images:product_variant_images(image_url, position)")
          .eq("id", cartRow.variant_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!product) return null;
  return { ...cartRow, product, variant } as CartLine;
}

interface CartCtx {
  items: CartLine[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  loading: boolean;
  add: (productId: string, size: string, quantity?: number, variantId?: string | null) => Promise<void>;
  setQuantity: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>(() => readCachedCart(null));
  const [loading, setLoading] = useState(false);

  const cacheItems = useCallback((nextItems: CartLine[]) => {
    setItems(nextItems);
    writeCachedCart(user?.id ?? null, nextItems);
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user) { cacheItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        id, product_id, variant_id, size, quantity,
        product:products(
          id, title, price_gnf, shipping_fee_gnf, shop_id,
          shop:shops(id, name, slug, commission_rate, payment_operator, payment_number),
          images:product_images(image_url, size)
        ),
        variant:product_variants(
          id, name, color, size, price_gnf,
          images:product_variant_images(image_url, position)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Impossible de charger le panier");
    else cacheItems((data as any) ?? []);
    setLoading(false);
  }, [user, cacheItems]);

  useEffect(() => {
    if (user) setItems(readCachedCart(user.id));
    refresh();
  }, [user?.id, refresh]);

  // Realtime: keep cart in sync across tabs/devices
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`cart-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        () => { refresh(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  const count = useMemo(() => items.reduce((s, l) => s + l.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce(
    (s, l) => s + ((l.variant?.price_gnf ?? l.product?.price_gnf) ?? 0) * l.quantity,
    0
  ), [items]);
  const shipping = useMemo(() => items.reduce((s, l) => s + (l.product?.shipping_fee_gnf ?? 0) * l.quantity, 0), [items]);
  const total = subtotal + shipping;

  async function add(productId: string, size: string, quantity = 1, variantId: string | null = null) {
    if (!user) { toast.error("Connectez-vous pour ajouter au panier"); return; }

    // Always check DB to avoid stale-state duplicate-key errors
    const { data: existingRow, error: lookupError } = await supabase
      .from("cart_items")
      .select("id, quantity, variant_id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("size", size as any)
      .maybeSingle();
    if (lookupError) { toast.error(lookupError.message); return; }

    if (existingRow) {
      const nextQuantity = existingRow.quantity + quantity;
      setItems((prev) => {
        const next = prev.map((i) => i.id === existingRow.id ? { ...i, quantity: nextQuantity, variant_id: variantId } : i);
        writeCachedCart(user.id, next);
        return next;
      });
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: nextQuantity, variant_id: variantId })
        .eq("id", existingRow.id);
      if (error) { toast.error(error.message); await refresh(); return; }
      await refresh();
      toast.success("Quantité mise à jour", {
        action: { label: "Voir le panier", onClick: () => { window.location.href = "/cart"; } },
      });
      return;
    }

    const { data: insertedRow, error } = await supabase.from("cart_items").insert({
      user_id: user.id, product_id: productId, size: size as any, quantity, variant_id: variantId,
    }).select("id, product_id, variant_id, size, quantity").single();
    if (error) { toast.error(error.message); return; }
    const hydrated = await hydrateCartLine(insertedRow as any);
    if (hydrated) cacheItems([hydrated, ...items.filter((i) => i.id !== hydrated.id)]);
    await refresh();
    toast.success("Article ajouté au panier", {
      duration: 5000,
      action: { label: "Voir le panier", onClick: () => { window.location.href = "/cart"; } },
    });
  }

  async function setQuantity(id: string, qty: number) {
    if (qty <= 0) return remove(id);
    const { error } = await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function clear() {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, count, subtotal, shipping, total, loading, add, setQuantity, remove, clear, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
