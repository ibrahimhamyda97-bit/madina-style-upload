import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Politique de Confidentialité</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Engagement Madina pour la protection de vos données personnelles, conformément au
            Règlement (UE) 2016/679 (« RGPD »).
          </p>
          <p className="text-xs text-primary-foreground/70 mt-3">Version 3.0 — En vigueur au 1ᵉʳ juin 2026</p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>1. Responsable du traitement</h2>
        <p>
          <strong>Madina E-Commerce</strong>, sise à Conakry (Guinée), agit en qualité de
          responsable du traitement au sens du RGPD. Notre Délégué à la Protection des Données
          (DPO) est joignable à l'adresse{" "}
          <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Identité</strong> : nom, prénom, date de naissance.</li>
          <li><strong>Coordonnées</strong> : adresse e-mail, téléphone, adresses de livraison (ville, quartier, détails).</li>
          <li><strong>Données de connexion</strong> : adresse IP, identifiants de session, journaux techniques.</li>
          <li><strong>Données de transaction</strong> : commandes, paiements via opérateurs Mobile Money agréés.</li>
          <li><strong>Documents d'identité</strong> (vendeurs et livreurs uniquement) : pièce d'identité et justificatifs, stockés de manière chiffrée.</li>
          <li><strong>Échanges avec l'assistant IA</strong> : strictement limités à l'amélioration du service.</li>
        </ul>

        <h2>3. Finalités &amp; bases légales</h2>
        <table>
          <thead>
            <tr><th>Finalité</th><th>Base légale (RGPD art. 6)</th></tr>
          </thead>
          <tbody>
            <tr><td>Gestion du compte, des commandes et de la livraison</td><td>Exécution du contrat</td></tr>
            <tr><td>Paiement et facturation</td><td>Obligation légale &amp; contrat</td></tr>
            <tr><td>Lutte contre la fraude</td><td>Intérêt légitime</td></tr>
            <tr><td>Communications marketing facultatives</td><td>Consentement (révocable)</td></tr>
            <tr><td>Assistance IA</td><td>Exécution du contrat &amp; intérêt légitime</td></tr>
            <tr><td>Conservation comptable</td><td>Obligation légale</td></tr>
          </tbody>
        </table>

        <h2>4. Destinataires</h2>
        <p>Vos données ne sont jamais vendues. Elles peuvent être transmises uniquement à :</p>
        <ul>
          <li>Les Vendeurs concernés par votre commande (nom, téléphone, adresse).</li>
          <li>Les Livreurs partenaires pour l'acheminement.</li>
          <li>Les prestataires de paiement (SenePay, opérateurs Mobile Money).</li>
          <li>Nos sous-traitants techniques (hébergement, IA, sécurité), liés par des accords de traitement (DPA) conformes au RGPD.</li>
          <li>Les autorités compétentes, sur requête légale.</li>
        </ul>

        <h2>5. Transferts hors UE</h2>
        <p>
          Certains sous-traitants (notamment d'hébergement et d'IA) peuvent traiter vos données dans
          des pays situés hors de l'Union européenne. Lorsque tel est le cas, des garanties
          appropriées (Clauses Contractuelles Types de la Commission européenne, certifications
          reconnues) sont mises en place pour assurer un niveau de protection équivalent.
        </p>

        <h2>6. Durées de conservation</h2>
        <ul>
          <li>Compte actif : pendant toute la durée d'utilisation.</li>
          <li>Données de commande : 10 ans (obligations comptables et fiscales).</li>
          <li>Documents d'identité : 5 ans après la fin de la relation contractuelle.</li>
          <li>Journaux techniques : 12 mois maximum.</li>
          <li>Données marketing : 3 ans après le dernier contact.</li>
        </ul>

        <h2>7. Sécurité</h2>
        <p>
          Chiffrement TLS de bout en bout, hachage des mots de passe (bcrypt/argon2),
          authentification forte, contrôle d'accès basé sur les rôles, journalisation, sauvegardes
          chiffrées et stockage privé pour les documents sensibles.
        </p>

        <h2>8. Vos droits</h2>
        <p>
          Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'accès, de
          rectification, d'effacement, de portabilité, d'opposition, de limitation du traitement
          et de retrait de votre consentement. Vous pouvez exercer ces droits à tout moment à
          l'adresse <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>. Vous
          disposez également du droit d'introduire une réclamation auprès d'une autorité de
          contrôle compétente (par exemple la CNIL en France).
        </p>

        <h2>9. Cookies</h2>
        <p>
          La Plateforme utilise exclusivement des cookies strictement nécessaires au fonctionnement
          (session, panier, authentification). Aucun cookie publicitaire tiers n'est déposé sans
          votre consentement préalable.
        </p>

        <h2>10. Mineurs</h2>
        <p>
          La Plateforme n'est pas destinée aux personnes âgées de moins de 16 ans. Aucune donnée
          n'est consciemment collectée auprès d'un mineur sans l'accord d'un représentant légal.
        </p>

        <h2>11. Évolutions</h2>
        <p>
          Toute évolution significative de la présente politique vous sera notifiée via la
          Plateforme ou par e-mail, avec un préavis raisonnable.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          Pour exercer vos droits ou pour toute question : <Link to="/cgu">CGU</Link> ·{" "}
          <Link to="/cgv">CGV</Link> ·{" "}
          <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>
        </p>
      </section>
    </div>
  );
}
