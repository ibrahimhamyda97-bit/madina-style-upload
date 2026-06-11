import { Link } from "react-router-dom";

export default function CGU() {
  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container text-center text-primary-foreground">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Conditions Générales d'Utilisation</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Cadre contractuel d'utilisation de la plateforme Madina.
          </p>
          <p className="text-xs text-primary-foreground/70 mt-3">Version 3.0 — En vigueur au 1ᵉʳ juin 2026</p>
        </div>
      </section>

      <section className="container py-14 max-w-3xl prose prose-neutral dark:prose-invert">
        <h2>Article 1 — Objet</h2>
        <p>
          Les présentes Conditions Générales d'Utilisation (« <strong>CGU</strong> ») ont pour objet de
          définir les modalités et conditions selon lesquelles <strong>Madina</strong> (ci-après « la
          Plateforme », « nous ») met à disposition de ses utilisateurs (ci-après « l'Utilisateur »,
          « vous ») un service de marketplace mettant en relation des vendeurs professionnels et des
          acheteurs, ainsi que les services connexes (assistance, gestion des commandes, livraison,
          paiement sécurisé).
        </p>

        <h2>Article 2 — Éditeur de la Plateforme</h2>
        <p>
          La Plateforme est éditée par <strong>Madina E-Commerce</strong>, dont le siège social est
          situé à Conakry (Guinée), joignable à l'adresse{" "}
          <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>. Hébergement assuré par
          des prestataires conformes aux standards européens de sécurité et de protection des données.
        </p>

        <h2>Article 3 — Acceptation et opposabilité</h2>
        <p>
          L'accès aux services suppose l'acceptation pleine et entière des présentes CGU.
          L'Utilisateur reconnaît disposer de la capacité juridique requise pour contracter.
          Toute version mise à jour est opposable dès sa publication sur la Plateforme ; en cas de
          modification substantielle, vous serez informé par voie électronique avec un préavis
          raisonnable.
        </p>

        <h2>Article 4 — Inscription et compte utilisateur</h2>
        <ul>
          <li>L'ouverture d'un compte requiert des informations exactes, complètes et à jour.</li>
          <li>Les identifiants sont strictement personnels et confidentiels.</li>
          <li>L'Utilisateur est seul responsable des actions effectuées depuis son compte.</li>
          <li>Toute utilisation frauduleuse doit nous être signalée sans délai.</li>
        </ul>

        <h2>Article 5 — Catégories d'utilisateurs</h2>
        <ul>
          <li><strong>Acheteurs</strong> — passent commande et reçoivent les produits.</li>
          <li><strong>Vendeurs</strong> — boutiques validées qui publient et vendent leurs produits.</li>
          <li><strong>Livreurs partenaires</strong> — assurent l'acheminement des commandes.</li>
          <li><strong>Administrateurs &amp; modérateurs</strong> — veillent à la conformité et à la sécurité.</li>
        </ul>

        <h2>Article 6 — Obligations de l'Utilisateur</h2>
        <p>
          L'Utilisateur s'engage à utiliser la Plateforme dans le respect des lois applicables, à ne
          publier aucun contenu illicite, contrefait, diffamatoire, discriminatoire, à caractère
          pornographique ou portant atteinte à l'ordre public, et à respecter les droits des tiers
          (propriété intellectuelle, vie privée, image).
        </p>

        <h2>Article 7 — Propriété intellectuelle</h2>
        <p>
          La marque, le logo, l'interface, le code source, les bases de données et l'ensemble des
          éléments de la Plateforme sont protégés par le droit de la propriété intellectuelle. Toute
          reproduction, représentation ou exploitation non autorisée est interdite. Les contenus
          publiés par les Vendeurs restent leur propriété ; ils nous concèdent une licence non
          exclusive d'usage à seule fin d'exploitation des services.
        </p>

        <h2>Article 8 — Service d'assistance IA</h2>
        <p>
          La Plateforme intègre un assistant intelligent destiné à fournir des informations sur les
          commandes, la livraison et le remboursement. Cet outil ne se substitue pas à un conseil
          juridique ou financier personnalisé ; ses réponses sont fournies à titre indicatif.
        </p>

        <h2>Article 9 — Responsabilité</h2>
        <p>
          Madina agit en qualité d'intermédiaire technique. Notre responsabilité est limitée aux
          obligations expressément mises à notre charge par les présentes CGU. Nous ne saurions être
          tenus responsables des dommages indirects, des pertes de chance, ni des manquements
          imputables à un Vendeur, à un Livreur, à un opérateur Mobile Money ou à un cas de force
          majeure.
        </p>

        <h2>Article 10 — Suspension et résiliation</h2>
        <p>
          Nous nous réservons le droit, après mise en demeure restée sans effet (sauf urgence ou
          manquement grave), de suspendre ou de résilier un compte en cas de violation des présentes
          CGU. L'Utilisateur peut clôturer son compte à tout moment via la rubrique « Mon profil ».
        </p>

        <h2>Article 11 — Données personnelles</h2>
        <p>
          Le traitement des données personnelles est encadré par notre{" "}
          <Link to="/confidentialite">Politique de Confidentialité</Link>, alignée sur les exigences
          du Règlement (UE) 2016/679 (« RGPD »).
        </p>

        <h2>Article 12 — Médiation et droit applicable</h2>
        <p>
          Tout différend fera l'objet d'une tentative préalable de résolution amiable. À défaut
          d'accord dans un délai de 30 jours, les tribunaux compétents seront ceux de Conakry, la
          loi applicable étant la loi de la République de Guinée, sans préjudice des dispositions
          impératives plus protectrices applicables aux consommateurs résidant dans l'Union
          européenne.
        </p>

        <p className="text-sm text-muted-foreground mt-10">
          Pour toute question relative aux CGU :{" "}
          <a href="mailto:contact@madina-sbk.com">contact@madina-sbk.com</a>
        </p>
      </section>
    </div>
  );
}
