import { useRef, useState } from "react";
import { Upload, Loader2, X, Image as ImageIcon, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImageCropperDialog from "./ImageCropperDialog";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  userId: string;
  folder: string;
  label?: string;
  aspect?: "square" | "banner";
  maxSizeMb?: number;
}

export default function ImageUploader({
  value,
  onChange,
  userId,
  folder,
  label,
  aspect = "square",
  maxSizeMb = 3,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const aspectRatio = aspect === "square" ? 1 : 3;

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return toast.error("Seules les images sont acceptées");
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      return toast.error(`Image trop lourde (max ${maxSizeMb} Mo)`);
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setCropSrc(dataUrl);
    } catch {
      toast.error("Impossible de lire l'image");
    }
  }

  async function uploadBlob(blob: Blob) {
    setUploading(true);
    const path = `${folder}/${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    onChange(pub.publicUrl);
    setUploading(false);
    setCropSrc(null);
    toast.success("Image enregistrée");
  }

  function openAdjustExisting() {
    if (!value) return;
    // For remote/CORS-protected URLs, fetch and convert to data URL so the cropper can read pixels
    fetch(value)
      .then((r) => r.blob())
      .then((b) => readAsDataUrl(new File([b], "img", { type: b.type || "image/jpeg" })))
      .then((url) => setCropSrc(url))
      .catch(() => toast.error("Impossible de charger cette image pour le recadrage"));
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div
        className={cn(
          "rounded-2xl border-2 border-dashed border-border bg-muted/30 overflow-hidden relative group transition-smooth hover:border-primary/50",
          aspect === "square" ? "aspect-square max-w-[200px]" : "aspect-[3/1] w-full"
        )}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-smooth grid place-items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={openAdjustExisting}
                className="rounded-xl shadow-soft"
              >
                <Crop className="h-4 w-4" /> Ajuster
              </Button>
            </div>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Supprimer"
              className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-smooth shadow-soft"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-full w-full grid place-items-center text-muted-foreground hover:text-primary transition-smooth"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <ImageIcon className="h-7 w-7" />
                <span className="text-xs font-medium">Cliquez pour choisir une image</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG · max {maxSizeMb} Mo</span>
              </div>
            )}
          </button>
        )}
        {uploading && value && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl"
        >
          <Upload className="h-4 w-4" /> {value ? "Remplacer" : "Téléverser"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAdjustExisting}
            disabled={uploading}
            className="rounded-xl"
          >
            <Crop className="h-4 w-4" /> Recadrer
          </Button>
        )}
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ou collez une URL https://..."
          className="h-9 rounded-xl text-sm flex-1"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <ImageCropperDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        aspect={aspectRatio}
        title={label ? `Ajuster — ${label}` : "Ajuster l'image"}
        onCancel={() => setCropSrc(null)}
        onConfirm={uploadBlob}
      />
    </div>
  );
}
