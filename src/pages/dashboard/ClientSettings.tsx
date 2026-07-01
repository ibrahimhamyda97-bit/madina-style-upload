import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, BookOpen, ChevronRight, Trash2 } from "lucide-react";

const legalLinks = [
  {
    to: "/cgu",
    label: "Conditions Générales d'Utilisation",
    description: "Cadre contractuel d'utilisation de la plateforme.",
    icon: FileText,
  },
  {
    to: "/cgv",
    label: "Conditions Générales de Vente",
    description: "Règles des transactions réalisées sur la plateforme.",
    icon: BookOpen,
  },
  {
    to: "/confidentialite",
    label: "Politique de Confidentialité",
    description: "Protection de vos données personnelles (RGPD).",
    icon: Shield,
  },
];

export default function ClientSettings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos préférences et consultez les documents légaux.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Documents légaux
        </h2>
        <div className="space-y-3">
          {legalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-smooth group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <link.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Compte
        </h2>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Zone dangereuse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La suppression de votre compte est définitive. Seules les données que la loi impose
              de conserver (facturation) sont archivées jusqu'à 10 ans. Toutes les autres données
              sont supprimées.
            </p>
            <a
              href="mailto:contact@madina-sbk.com?subject=Suppression%20de%20compte"
              className="inline-flex items-center gap-2 text-sm font-medium text-destructive hover:underline"
            >
              Demander la suppression de mon compte
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
