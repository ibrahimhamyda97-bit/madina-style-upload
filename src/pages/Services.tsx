import { ShoppingBag, Truck, ShieldCheck, Smartphone, Palette, Headphones } from "lucide-react";

export default function Services() {
  const services = [
    { icon: ShoppingBag, title: "Vente en ligne", desc: "Parcourez des milliers d'articles de boutiques guinéennes vérifiées. Filtrez par catégorie, taille et couleur pour trouver exactement ce que vous cherchez." },
    { icon: Palette, title: "Détection IA", desc: "Notre intelligence artificielle détecte automatiquement les couleurs et le type de chaque article à partir des photos, pour une recherche plus précise." },
    { icon: Truck, title: "Livraison à domicile", desc: "Un réseau de livreurs partenaires assure la livraison de vos commandes partout en Guinée avec suivi en temps réel." },
    { icon: ShieldCheck, title: "Paiement sécurisé", desc: "Payez par Mobile Money (Orange Money, MTN MoMo) en toute sécurité. Chaque transaction est vérifiée et tracée." },
    { icon: Smartphone, title: "Boutique en ligne", desc: "Vous êtes vendeur ? Créez votre boutique en quelques minutes, ajoutez vos produits avec jusqu'à 5 variantes photo et commencez à vendre immédiatement." },
    { icon: Headphones, title: "Support client", desc: "Notre équipe est disponible pour vous accompagner — que vous soyez acheteur ou vendeur — pour une expérience fluide et agréable." },
  ];

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Nos services</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour acheter et vendre en Guinée, au même endroit.
          </p>
        </div>
      </section>

      <section className="container py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {services.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-soft hover:shadow-elegant transition-smooth animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary mb-4">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
