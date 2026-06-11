import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PayoutPanel from "@/components/PayoutPanel";

export default function CourierEarnings() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Wallet className="h-7 w-7 text-primary" /> Mes gains
        </h1>
        <p className="text-muted-foreground mt-2">
          Vos frais de livraison cumulés sur les courses livrées. Demandez un retrait quand vous le souhaitez.
        </p>
      </div>
      <PayoutPanel scope="courier" userId={user.id} />
    </div>
  );
}
