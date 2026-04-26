export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-20">
      <div className="h-1 bg-gradient-flag" />
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-lg">Madina</p>
          <p className="text-xs text-muted-foreground">La marketplace premium de Guinée — Conakry, Kindia, Kankan & au-delà.</p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Madina. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
