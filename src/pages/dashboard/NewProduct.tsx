import ProductUploadForm from "@/components/ProductUploadForm";

export default function NewProduct({ mode }: { mode: "admin" | "vendor" }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Nouveau produit</h1>
        <p className="text-muted-foreground mt-1">5 photos, une par taille — la couleur et le type d'objet sont détectés automatiquement par l'IA.</p>
      </div>
      <ProductUploadForm mode={mode} />
    </div>
  );
}
