import ProductUploadForm from "@/components/ProductUploadForm";

export default function NewProduct({ mode }: { mode: "admin" | "vendor" }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Nouveau produit</h1>
        <p className="text-muted-foreground mt-1">
          1 photo principale + prix + tailles. Ajoutez ensuite des variantes (couleur · taille · prix · photos) si besoin.
        </p>
      </div>
      <ProductUploadForm mode={mode} />
    </div>
  );
}
