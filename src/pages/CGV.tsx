import { Link } from "react-router-dom";

export default function CGV() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Conditions Générales de Vente</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Cadre contractuel des transactions réalisées sur la Plateforme Madina.
          </p>
          <p className="text-xs text-primary-foreground/70 mt-3">Version 3.0 — En vigueur au 1ᵉʳ juin 2026</p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>Article 1 — Champ d'application</h2>
        <p>
          Les présentes Conditions Générales de Vente (« <strong>CGV</strong> ») régissent
          l'ensemble des contrats conclus entre les Vendeurs titulaires d'une boutique validée sur
          la Plateforme Madina et les Acheteurs. Elles s'appliquent à l'exclusion de toutes autres
          conditions et complètent les{" "}
          <Link to="/cgu">Conditions Générales d'Utilisation</Link>.
        </p>

        <h2>Article 2 — Produits</h2>
        <p>
          Les produits proposés sont décrits avec la plus grande exactitude (photos, dimensions,
          composition, prix). Madina met en œuvre des contrôles automatisés et humains pour limiter
          les anomalies. La responsabilité éditoriale du contenu publié incombe au Vendeur.
        </p>

        <h2>Article 3 — Prix</h2>
        <p>
          Les prix sont indiqués en Francs Guinéens (GNF), toutes taxes comprises, hors frais de
          livraison facturés séparément. Madina perçoit une commission sur chaque transaction,
          fixée d'un commun accord avec le Vendeur. Les promotions sont signalées de manière claire
          et loyale.
        </p>

        <h2>Article 4 — Commande</h2>
        <p>
          Toute commande emporte adhésion pleine et entière aux présentes CGV. Un numéro unique au
          format <strong>SAM-XXXDJXXX</strong> est attribué à chaque commande, gage de traçabilité
          pour l'Acheteur, le Vendeur et le Livreur.
        </p>

        <h2>Article 5 — Paiement</h2>
        <p>
          Les paiements sont sécurisés et réalisés via Mobile Money (Orange Money, MTN MoMo) ou
          tout autre moyen agréé. La commande n'est confirmée qu'à compter de la réception
          effective du règlement. Aucune donnée bancaire complète n'est conservée par Madina.
        </p>

        <h2>Article 6 — Livraison</h2>
        <p>
          La livraison est assurée par les Livreurs partenaires. Un <strong>code de prise en charge</strong>{" "}
          est remis au Vendeur, un <strong>code de livraison</strong> à l'Acheteur, sécurisant
          chaque étape. Les délais sont communiqués à titre indicatif et peuvent varier selon la
          ville et le quartier de destination.
        </p>

        <h2>Article 7 — Droit de rétractation et retours</h2>
        <p>
          Conformément aux usages applicables aux ventes à distance et à l'esprit de l'article L221-18
          du Code de la consommation européen, l'Acheteur dispose d'un délai de{" "}
          <strong>48 heures</strong> à compter de la réception pour signaler tout produit non conforme
          ou défectueux, et d'un délai global de <strong>14 jours</strong> pour exercer son droit de
          rétractation lorsque la nature du produit l'autorise (hors produits personnalisés, denrées
          périssables et articles d'hygiène descellés).
        </p>

        <h2>Article 8 — Remboursement</h2>
        <p>
          En cas de retour validé, le remboursement intervient par le même canal que le paiement
          initial, dans un délai maximal de <strong>14 jours</strong> à compter de l'acceptation de
          la réclamation. Les frais de retour restent à la charge de l'Acheteur, sauf défaut avéré
          imputable au Vendeur.
        </p>

        <h2>Article 9 — Garanties</h2>
        <p>
          Les produits bénéficient des garanties légales de conformité et contre les vices cachés.
          Le Vendeur peut proposer une garantie commerciale additionnelle, dont les modalités sont
          précisées sur la fiche produit.
        </p>

        <h2>Article 10 — Responsabilité</h2>
        <p>
          Madina ne peut être tenue responsable des dommages indirects résultant de l'usage des
          produits. Sa responsabilité est, en tout état de cause, limitée au montant de la
          transaction litigieuse.
        </p>

        <h2>Article 11 — Médiation et litiges</h2>
        <p>
          Tout litige fera l'objet d'une tentative de médiation gratuite par le service client
          Madina. À défaut d'accord amiable, les tribunaux de Conakry seront seuls compétents, la
          loi applicable étant celle de la République de Guinée, sans préjudice des dispositions
          impératives plus protectrices applicables aux consommateurs résidant dans l'Union
          européenne.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          Service client : <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>
        </p>
      </section>
    </div>
  );
}
