import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CartLine {
  id: string;
  product_id: string;
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
}

interface CartCtx {
  items: CartLine[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  loading: boolean;
  add: (productId: string, size: string, quantity?: number) => Promise<void>;
  setQuantity: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        id, product_id, size, quantity,
        product:products(
          id, title, price_gnf, shipping_fee_gnf, shop_id,
          shop:shops(id, name, slug, commission_rate, payment_operator, payment_number),
          images:product_images(image_url, size)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setItems((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const count = items.reduce((s, l) => s + l.quantity, 0);
  const subtotal = items.reduce((s, l) => s + (l.product?.price_gnf ?? 0) * l.quantity, 0);
  const shipping = items.reduce((s, l) => s + (l.product?.shipping_fee_gnf ?? 0) * l.quantity, 0);
  const total = subtotal + shipping;

  async function add(productId: string, size: string, quantity = 1) {
    if (!user) { toast.error("Connectez-vous pour ajouter au panier"); return; }
    const existing = items.find((i) => i.product_id === productId && i.size === size);
    if (existing) {
      await setQuantity(existing.id, existing.quantity + quantity);
      toast.success("Quantité mise à jour");
      return;
    }
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id, product_id: productId, size: size as any, quantity,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Ajouté au panier");
    refresh();
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
