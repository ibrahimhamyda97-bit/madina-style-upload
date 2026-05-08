import { Store, Users, Heart, Globe, ShieldCheck, Crown } from "lucide-react";

const TEAM = [
  {
    name: "SAMIROU",
    role: "Directeur Général (DG)",
    icon: Crown,
    color: "from-yellow-500/20 to-amber-500/5 border-yellow-500/30",
    iconColor: "text-yellow-500",
  },
  {
    name: "KOLLET KEITA",
    role: "Modérateur",
    icon: ShieldCheck,
    color: "from-primary/20 to-accent/5 border-primary/30",
    iconColor: "text-primary",
  },
];

export default function About() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">À propos de Madina</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Votre centre commercial dans votre poche — nous connectons les vendeurs guinéens aux acheteurs à travers tout le pays.
          </p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl">
        <h2 className="font-display text-2xl font-bold mb-4">Notre histoire</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Madina est née d'une vision simple : rendre accessible à tous les Guinéens la richesse des produits locaux.
          Inspirée du célèbre marché de Madina à Conakry, notre plateforme numérique rassemble des centaines de boutiques
          et des milliers d'articles — vêtements, chaussures, électronique, beauté et bien plus — le tout accessible
          depuis votre téléphone.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Nous croyons au commerce équitable, à la transparence et à la qualité. Chaque boutique est vérifiée,
          chaque produit est photographié avec soin, et notre système de détection IA garantit que vous recevez
          exactement ce que vous voyez.
        </p>

        <h2 className="font-display text-2xl font-bold mb-4 mt-10">Nos valeurs</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { icon: Store, title: "Commerce local", desc: "Nous soutenons les entrepreneurs et artisans guinéens en leur offrant une vitrine numérique moderne." },
            { icon: Users, title: "Communauté", desc: "Madina est plus qu'une marketplace — c'est une communauté de vendeurs et d'acheteurs qui se font confiance." },
            { icon: Heart, title: "Qualité & confiance", desc: "Boutiques vérifiées, photos réelles, détection IA des couleurs — zéro mauvaise surprise." },
            { icon: Globe, title: "Accessibilité", desc: "De Conakry à Kankan, de Kindia à N'Zérékoré — Madina livre partout en Guinée." },
          ].map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <v.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Équipe */}
      <section className="container pb-16">
        <h2 className="font-display text-2xl font-bold mb-6">Notre équipe</h2>
        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${member.color} p-6 shadow-soft`}
            >
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-full bg-background/80 grid place-items-center shadow-sm`}>
                  <member.icon className={`h-7 w-7 ${member.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{member.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
