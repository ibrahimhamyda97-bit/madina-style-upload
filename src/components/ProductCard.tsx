import { Link } from "react-router-dom";

export interface ProductCardData {
  id: string;
  title: string;
  price_gnf: number;
  category: string;
  detected_color?: string | null;
  shop: { name: string; slug: string } | null;
  images: { image_url: string; size: string; position: number }[];
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const cover = [...(product.images ?? [])].sort((a, b) => a.position - b.position)[0]?.image_url;
  return (
    <Link
      to={`/product/${product.id}`}
      className="group bg-card border border-border rounded-2xl overflow-hidden shadow-soft hover:shadow-elegant transition-smooth animate-scale-in flex flex-col"
    >
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {cover ? (
          <img src={cover} alt={product.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="h-full w-full bg-gradient-card" />
        )}
        {product.detected_color && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur text-[10px] font-medium uppercase tracking-wider">
            {product.detected_color}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.shop?.name ?? "Boutique"}</p>
        <h3 className="font-medium text-sm line-clamp-2 leading-snug">{product.title}</h3>
        <p className="font-display text-base font-bold text-primary mt-auto pt-1">
          {product.price_gnf.toLocaleString("fr-FR")} <span className="text-xs font-medium text-muted-foreground">GNF</span>
        </p>
      </div>
    </Link>
  );
}
