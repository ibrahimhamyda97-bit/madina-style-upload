import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-20">
      <div className="h-1 bg-gradient-flag" />
      <div className="container py-10 grid md:grid-cols-4 gap-8">
        <div>
          <p className="font-display font-bold text-lg">Madina</p>
          <p className="text-xs text-muted-foreground mt-1">Votre centre commercial dans votre poche — Conakry, Kindia, Kankan & au-delà.</p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Navigation</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Accueil</Link></li>
            <li><Link to="/shops" className="hover:text-foreground transition-colors">Boutiques</Link></li>
            <li><Link to="/onboarding/shop" className="hover:text-foreground transition-colors">Ouvrir ma boutique</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Informations</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground transition-colors">À propos de nous</Link></li>
            <li><Link to="/services" className="hover:text-foreground transition-colors">Nos services</Link></li>
            <li><Link to="/conditions" className="hover:text-foreground transition-colors">Conditions de vente</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Contact</h4>
          <p className="text-sm text-muted-foreground">Conakry, Guinée</p>
          <p className="text-sm text-muted-foreground">contact@madina-sbk.com</p>
        </div>
      </div>
      <div className="container pb-6">
        <p className="text-xs text-muted-foreground text-center">© {new Date().getFullYear()} Madina. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
