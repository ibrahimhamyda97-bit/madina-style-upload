import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Politique de Confidentialité</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Engagement Madina SBK pour la protection de vos données personnelles, conformément au
            Règlement (UE) 2016/679 (« RGPD »).
          </p>
          <p className="text-xs text-primary-foreground/70 mt-3">Version 4.0 — En vigueur au 1<sup>er</sup> juillet 2026</p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <p className="text-sm text-muted-foreground">
          La présente politique s'applique à l'application mobile Madina SBK (iOS et Android) ainsi
          qu'au site <a href="https://madina-sbk.com" target="_blank" rel="noopener noreferrer">madina-sbk.com</a>{" "}
          (ensemble, la « Plateforme »).
        </p>

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
          <li><strong>Contenu utilisateur</strong> : photos de produits (vendeurs), avis et évaluations.</li>
          <li><strong>Documents d'identité</strong> (vendeurs et livreurs uniquement) : pièce d'identité et justificatifs, stockés de manière chiffrée.</li>
          <li><strong>Échanges avec l'assistant IA</strong> : strictement limités à l'amélioration du service.</li>
        </ul>
        <p><strong>Nous ne collectons pas</strong> : localisation GPS précise en arrière-plan, contacts, SMS, données de santé, données publicitaires tierces.</p>

        <h2>3. Autorisations de l'appareil</h2>
        <ul>
          <li><strong>Appareil photo / photos</strong> : uniquement pour ajouter une photo de profil ou, pour les vendeurs, des photos de produits. Aucune image n'est consultée sans votre action.</li>
          <li><strong>Notifications push</strong> : pour vous informer de l'état de vos commandes et livraisons. Révocable dans les réglages du téléphone.</li>
        </ul>
        <p>Ces autorisations sont facultatives et demandées au moment de l'usage. Le refus n'empêche pas l'utilisation générale de l'application.</p>

        <h2>4. Finalités &amp; bases légales</h2>
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

        <h2>5. Destinataires et sous-traitants</h2>
        <p>Vos données ne sont jamais vendues. Elles peuvent être transmises uniquement à :</p>
        <ul>
          <li>Les Vendeurs concernés par votre commande (nom, téléphone, adresse).</li>
          <li>Les Livreurs partenaires pour l'acheminement.</li>
          <li>Les prestataires de paiement : <strong>CinetPay</strong> et <strong>SenePay</strong>, qui traitent les paiements Mobile Money (Orange Money, MTN, etc.).</li>
          <li>Nos sous-traitants techniques, liés par des accords de traitement (DPA) conformes au RGPD : <strong>Supabase Inc.</strong> (hébergement de la base de données et authentification) et <strong>Lovable</strong> (passerelle d'IA acheminant les requêtes de l'assistant vers les modèles Google Gemini, sans réutilisation à d'autres fins).</li>
          <li>Les autorités compétentes, sur requête légale.</li>
        </ul>

        <h2>6. Transferts hors UE</h2>
        <p>
          Certains de nos sous-traitants — notamment Supabase (hébergement) et Lovable / Google
          (assistant IA) — peuvent traiter vos données hors de l'Union européenne. Dans ce cas,
          des garanties appropriées (Clauses Contractuelles Types de la Commission européenne,
          certifications reconnues) sont mises en place pour assurer un niveau de protection équivalent.
        </p>

        <h2>7. Durées de conservation</h2>
        <ul>
          <li>Compte actif : pendant toute la durée d'utilisation.</li>
          <li>Données de commande : 10 ans (obligations comptables et fiscales).</li>
          <li>Documents d'identité : 5 ans après la fin de la relation contractuelle.</li>
          <li>Journaux techniques : 12 mois maximum.</li>
          <li>Données marketing : 3 ans après le dernier contact.</li>
        </ul>

        <h2>8. Sécurité</h2>
        <p>
          Chiffrement TLS de bout en bout, hachage des mots de passe (bcrypt/argon2),
          authentification forte, contrôle d'accès basé sur les rôles (Row Level Security sur
          toutes les tables), journalisation, sauvegardes chiffrées et stockage privé pour les
          documents sensibles.
        </p>

        <h2>9. Vos droits</h2>
        <p>
          Conformément aux articles 15 à 22 du RGPD, vous disposez d'un droit d'accès, de
          rectification, d'effacement, de portabilité, d'opposition, de limitation du traitement
          et de retrait de votre consentement. Vous pouvez les exercer à tout moment à{" "}
          <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>. Vous disposez
          également du droit d'introduire une réclamation auprès d'une autorité de contrôle
          compétente (par exemple la CNIL en France).
        </p>

        <h2>10. Suppression de votre compte et de vos données</h2>
        <p>Vous pouvez supprimer votre compte et vos données personnelles à tout moment :</p>
        <ul>
          <li>Depuis l'application : <em>Compte › Paramètres du compte › Zone dangereuse › Supprimer mon compte</em>.</li>
          <li>Depuis le web : <a href="https://madina-sbk.com/suppression-compte" target="_blank" rel="noopener noreferrer">https://madina-sbk.com/suppression-compte</a>.</li>
          <li>Par e-mail : <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a> (objet « Suppression de compte »).</li>
        </ul>
        <p>
          La suppression est définitive. Seules les données que la loi impose de conserver
          (facturation) sont archivées jusqu'à 10 ans, sans accès depuis votre compte. Toutes
          les autres données sont supprimées.
        </p>

        <h2>11. Cookies</h2>
        <p>
          La Plateforme utilise exclusivement des cookies strictement nécessaires au fonctionnement
          (session, panier, authentification). Aucun cookie publicitaire tiers n'est déposé sans
          votre consentement préalable.
        </p>

        <h2>12. Mineurs</h2>
        <p>
          La Plateforme n'est pas destinée aux personnes de moins de 16 ans. Aucune donnée
          n'est consciemment collectée auprès d'un mineur sans l'accord d'un représentant légal.
        </p>

        <h2>13. Évolutions</h2>
        <p>
          Toute évolution significative de la présente politique vous sera notifiée via la
          Plateforme ou par e-mail, avec un préavis raisonnable. La date de dernière mise à jour
          figure en tête de document.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          Contact : <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a> — Madina E-Commerce, Conakry, Guinée.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link to="/cgu">CGU</Link> · <Link to="/cgv">CGV</Link>
        </p>
      </section>
    </div>
  );
}
