import { Store, Users, Heart, Globe, ShieldCheck, Crown, Star, Briefcase, Award, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TEAM_ICONS: Record<string, { icon: any; color: string; iconColor: string }> = {
  crown: { icon: Crown, color: "from-yellow-500/20 to-amber-500/5 border-yellow-500/30", iconColor: "text-yellow-500" },
  shield: { icon: ShieldCheck, color: "from-primary/20 to-accent/5 border-primary/30", iconColor: "text-primary" },
  star: { icon: Star, color: "from-purple-500/20 to-fuchsia-500/5 border-purple-500/30", iconColor: "text-purple-500" },
  briefcase: { icon: Briefcase, color: "from-blue-500/20 to-cyan-500/5 border-blue-500/30", iconColor: "text-blue-500" },
  award: { icon: Award, color: "from-rose-500/20 to-pink-500/5 border-rose-500/30", iconColor: "text-rose-500" },
  user: { icon: UserCog, color: "from-emerald-500/20 to-teal-500/5 border-emerald-500/30", iconColor: "text-emerald-500" },
};

type Member = { id: string; name: string; role: string; icon: string };

export default function About() {
  const [team, setTeam] = useState<Member[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("team_members")
      .select("id,name,role,icon")
      .order("position", { ascending: true })
      .then(({ data }: any) => setTeam(data ?? []));
  }, []);

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80 mb-3">Marketplace — Conakry · Guinée</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">À propos de Madina</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Une marketplace nouvelle génération, pensée pour le commerce ouest-africain et alignée
            sur les standards européens de sécurité, de transparence et de protection des données.
          </p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl">
        <h2 className="font-display text-2xl font-bold mb-4">Notre mission</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Madina connecte des entrepreneurs guinéens à une clientèle nationale et internationale via
          une plateforme moderne, sécurisée et accessible depuis un simple smartphone. Notre
          ambition : faire du commerce local guinéen une référence régionale en matière
          d'<strong>expérience d'achat</strong>, de <strong>logistique</strong> et de
          <strong> confiance</strong>.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Inspirée du marché historique de Madina à Conakry, notre plateforme rassemble des
          centaines de boutiques vérifiées, des dizaines de milliers de produits et un réseau de
          livreurs partenaires couvrant les principales villes du pays.
        </p>

        <h2 className="font-display text-2xl font-bold mb-4 mt-10">Nos engagements</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { icon: ShieldCheck, title: "Conformité &amp; sécurité", desc: "Chiffrement TLS, authentification forte, conformité RGPD pour les utilisateurs européens et standards bancaires pour les paiements." },
            { icon: Store, title: "Commerce local valorisé", desc: "Nous offrons aux entrepreneurs guinéens une vitrine professionnelle et des outils de gestion équivalents à ceux des grandes plateformes mondiales." },
            { icon: Users, title: "Communauté de confiance", desc: "Boutiques vérifiées, modération active, support humain et assistant IA disponibles 24/7." },
            { icon: Heart, title: "Qualité contrôlée", desc: "Détection IA des photos et des couleurs, vérification d'identité des vendeurs, protocole de remise et de réception sécurisé par codes." },
            { icon: Globe, title: "Couverture nationale", desc: "De Conakry à N'Zérékoré, en passant par Kindia et Kankan — un réseau logistique en croissance continue." },
            { icon: Award, title: "Transparence financière", desc: "Commissions claires, suivi en temps réel des soldes vendeurs et livreurs, demandes de retrait traçables." },
          ].map((v, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <v.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1" dangerouslySetInnerHTML={{ __html: v.title }} />
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-6">
          <h3 className="font-display text-lg font-bold mb-2">Une gouvernance responsable</h3>
          <p className="text-sm text-muted-foreground">
            Madina s'appuie sur une équipe pluridisciplinaire (technologie, logistique, juridique,
            relation client) et collabore avec des partenaires reconnus pour le paiement,
            l'hébergement et la cybersécurité. Nos politiques sont régulièrement auditées et
            publiées dans nos <a href="/cgu" className="text-primary underline">CGU</a>, nos{" "}
            <a href="/cgv" className="text-primary underline">CGV</a> et notre{" "}
            <a href="/confidentialite" className="text-primary underline">Politique de
            confidentialité</a>.
          </p>
        </div>
      </section>

      {team.length > 0 && (
        <section className="container pb-16">
          <h2 className="font-display text-2xl font-bold mb-6">Notre équipe</h2>
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
            {team.map((m) => {
              const cfg = TEAM_ICONS[m.icon] ?? TEAM_ICONS.user;
              const Icon = cfg.icon;
              return (
                <div
                  key={m.id}
                  className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cfg.color} p-6 shadow-soft`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-background/80 grid place-items-center shadow-sm shrink-0">
                      <Icon className={`h-7 w-7 ${cfg.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold truncate">{m.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium">{m.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
