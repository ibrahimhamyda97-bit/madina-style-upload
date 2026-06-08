export default function Privacy() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Politique de Confidentialité</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            La protection de vos données personnelles est une priorité absolue pour Madina.
          </p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>1. Responsable du traitement</h2>
        <p>
          Madina, dont le siège est situé à Conakry (Guinée), est responsable du traitement des données personnelles
          collectées sur la Plateforme. Pour toute question : <strong>contact@madina-sbk.com</strong>.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li>Identité : nom, prénom, date de naissance.</li>
          <li>Coordonnées : adresse e-mail, téléphone, adresse de livraison (ville, quartier).</li>
          <li>Données de connexion : adresse IP, identifiants de session, journaux techniques.</li>
          <li>Données de transaction : commandes, paiements (via opérateurs Mobile Money agréés).</li>
          <li>Documents d'identité (uniquement pour vendeurs et livreurs, stockés de manière sécurisée).</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <p>Vos données sont traitées pour :</p>
        <ul>
          <li>Gérer votre compte et vos commandes.</li>
          <li>Assurer le service de livraison et le paiement sécurisé.</li>
          <li>Lutter contre la fraude et garantir la sécurité de la Plateforme.</li>
          <li>Vous adresser, le cas échéant, des informations relatives à votre commande.</li>
          <li>Répondre à nos obligations légales et réglementaires.</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>
          Le traitement repose sur l'exécution du contrat (commande, livraison), votre consentement (assistance IA,
          communications marketing facultatives) et nos obligations légales.
        </p>

        <h2>5. Destinataires</h2>
        <p>
          Vos données ne sont jamais vendues. Elles peuvent être transmises uniquement à :
        </p>
        <ul>
          <li>Les vendeurs concernés par votre commande (nom, téléphone, adresse de livraison).</li>
          <li>Les livreurs partenaires pour assurer la livraison.</li>
          <li>Les prestataires de paiement (SenePay, opérateurs Mobile Money) pour valider la transaction.</li>
          <li>Les autorités compétentes, en cas de demande légale.</li>
        </ul>

        <h2>6. Durée de conservation</h2>
        <ul>
          <li>Compte actif : pendant toute la durée d'utilisation.</li>
          <li>Données de commande : 10 ans à des fins comptables et légales.</li>
          <li>Documents d'identité : 5 ans après la fin de la relation contractuelle.</li>
        </ul>

        <h2>7. Sécurité</h2>
        <p>
          Madina met en œuvre des mesures techniques et organisationnelles avancées : chiffrement, contrôle d'accès,
          authentification forte, sauvegardes régulières, journalisation et stockage sécurisé.
        </p>

        <h2>8. Vos droits</h2>
        <p>
          Conformément à la réglementation applicable, vous disposez d'un droit d'accès, de rectification, d'effacement,
          de portabilité, d'opposition et de limitation du traitement. Vous pouvez exercer ces droits à tout moment
          en écrivant à <strong>contact@madina-sbk.com</strong>.
        </p>

        <h2>9. Cookies</h2>
        <p>
          La Plateforme utilise uniquement des cookies strictement nécessaires au fonctionnement (session, panier,
          authentification). Aucun cookie publicitaire tiers n'est déposé sans votre consentement.
        </p>

        <h2>10. Modifications</h2>
        <p>
          Madina peut modifier la présente politique. Toute évolution significative vous sera notifiée via la
          Plateforme.
        </p>

        <p className="text-sm text-muted-foreground mt-10">Dernière mise à jour : juin 2026</p>
      </section>
    </div>
  );
}
