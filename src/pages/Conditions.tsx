export default function Conditions() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Conditions générales de vente</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Les règles qui encadrent vos achats et ventes sur Madina.
          </p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales de vente (CGV) régissent l'ensemble des transactions
          effectuées sur la plateforme Madina entre les acheteurs et les vendeurs. En utilisant la
          plateforme, vous acceptez sans réserve les présentes conditions.
        </p>

        <h2>2. Inscription et compte</h2>
        <p>
          L'utilisation de Madina nécessite la création d'un compte avec une adresse e-mail valide.
          Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute activité
          effectuée sous votre compte est de votre responsabilité.
        </p>

        <h2>3. Produits et prix</h2>
        <p>
          Les prix sont affichés en Francs Guinéens (GNF) et incluent le prix du produit. Les frais de
          livraison sont indiqués séparément lors de la commande. Les photos et descriptions des produits
          sont fournies par les vendeurs. Madina utilise la détection IA pour vérifier la cohérence des
          images mais ne garantit pas une correspondance parfaite.
        </p>

        <h2>4. Commandes et paiement</h2>
        <p>
          Les commandes sont confirmées après réception du paiement par Mobile Money (Orange Money, MTN MoMo)
          ou tout autre moyen de paiement accepté. Un numéro de référence vous est communiqué pour le suivi
          de votre commande.
        </p>

        <h2>5. Livraison</h2>
        <p>
          La livraison est assurée par des livreurs partenaires de Madina. Les délais de livraison varient
          selon la localisation. Un code de prise en charge et un code de livraison sont générés pour
          sécuriser chaque étape. Le client doit vérifier l'état du colis à la réception.
        </p>

        <h2>6. Retours et réclamations</h2>
        <p>
          En cas de produit non conforme à la description ou endommagé, le client peut formuler une
          réclamation dans les 48 heures suivant la réception. Les retours sont soumis à l'accord du
          vendeur. Les frais de retour peuvent être à la charge de l'acheteur sauf en cas de faute du vendeur.
        </p>

        <h2>7. Responsabilité des vendeurs</h2>
        <p>
          Chaque vendeur est responsable de la qualité, de la conformité et de la disponibilité de ses
          produits. Madina agit en tant qu'intermédiaire et n'est pas responsable des litiges directs
          entre acheteurs et vendeurs, mais s'engage à faciliter leur résolution.
        </p>

        <h2>8. Protection des données</h2>
        <p>
          Madina s'engage à protéger vos données personnelles conformément aux lois en vigueur en
          République de Guinée. Vos informations ne sont jamais vendues à des tiers et sont utilisées
          uniquement dans le cadre du fonctionnement de la plateforme.
        </p>

        <h2>9. Modification des CGV</h2>
        <p>
          Madina se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs
          seront informés des modifications importantes. L'utilisation continue de la plateforme vaut
          acceptation des nouvelles conditions.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          Dernière mise à jour : avril 2026
        </p>
      </section>
    </div>
  );
}
