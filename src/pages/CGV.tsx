export default function CGV() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Conditions Générales de Vente</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Les règles qui encadrent vos achats et ventes sur Madina.
          </p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des transactions conclues sur la
          Plateforme Madina entre les vendeurs (titulaires d'une boutique validée) et les acheteurs.
        </p>

        <h2>Article 2 — Produits</h2>
        <p>
          Les produits proposés à la vente font l'objet d'une description précise (photos, taille, prix). Madina
          vérifie la cohérence des produits via des outils d'analyse d'image, mais la responsabilité du contenu
          publié incombe au vendeur.
        </p>

        <h2>Article 3 — Prix</h2>
        <p>
          Les prix sont affichés en Francs Guinéens (GNF), TTC. Les frais de livraison sont indiqués séparément avant
          validation de la commande. Madina perçoit une commission sur chaque vente, conformément à l'accord conclu
          avec le vendeur.
        </p>

        <h2>Article 4 — Commande</h2>
        <p>
          Toute commande implique l'acceptation pleine et entière des présentes CGV. Un numéro unique au format
          <strong> SAM-XXXDJXXX</strong> est attribué à chaque commande pour assurer son suivi.
        </p>

        <h2>Article 5 — Paiement</h2>
        <p>
          Les paiements sont réalisés via Mobile Money (Orange Money, MTN MoMo) ou tout autre moyen mis à disposition
          sur la Plateforme. La commande n'est confirmée qu'après réception effective du paiement.
        </p>

        <h2>Article 6 — Livraison</h2>
        <p>
          La livraison est assurée par les livreurs partenaires de Madina. Un <strong>code de prise en charge</strong>
          est remis au vendeur et un <strong>code de livraison</strong> est remis à l'acheteur afin de sécuriser
          chaque étape du parcours.
        </p>

        <h2>Article 7 — Droit de rétractation et retours</h2>
        <p>
          Conformément aux usages applicables, l'acheteur dispose d'un délai de <strong>48 heures</strong> après
          réception pour signaler tout produit non conforme ou défectueux. Les retours sont soumis à validation par
          le vendeur ou par le service Madina.
        </p>

        <h2>Article 8 — Remboursement</h2>
        <p>
          En cas de produit non conforme avéré, le remboursement est effectué par le même canal que le paiement
          initial, dans un délai maximal de 14 jours après acceptation de la réclamation.
        </p>

        <h2>Article 9 — Responsabilité</h2>
        <p>
          Madina ne saurait être tenue responsable des dommages indirects résultant d'un usage de la Plateforme.
          Sa responsabilité est limitée au montant de la commande litigieuse.
        </p>

        <h2>Article 10 — Litiges</h2>
        <p>
          Tout litige fera d'abord l'objet d'une tentative de médiation par Madina. À défaut d'accord amiable, les
          tribunaux de Conakry seront seuls compétents.
        </p>

        <p className="text-sm text-muted-foreground mt-10">Dernière mise à jour : juin 2026</p>
      </section>
    </div>
  );
}
