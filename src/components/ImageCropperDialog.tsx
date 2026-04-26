import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut, RotateCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CropArea { x: number; y: number; width: number; height: number }

interface ImageCropperDialogProps {
  open: boolean;
  imageSrc: string | null;
  aspect: number; // 1 for square, 3 for banner
  title?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

export default function ImageCropperDialog({
  open, imageSrc, aspect, title = "Ajuster l'image", onCancel, onConfirm,
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: CropArea, areaPx: CropArea) => {
    setCroppedArea(areaPx);
  }, []);

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedArea(null);
  }

  async function handleConfirm() {
    if (!imageSrc || !croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea, rotation);
      await onConfirm(blob);
      reset();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            Faites glisser pour recadrer, utilisez le zoom et la rotation pour ajuster avant d'enregistrer.
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-muted/40 h-[360px] sm:h-[420px]">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              objectFit="contain"
              restrictPosition
            />
          )}
        </div>

        <div className="px-6 py-4 space-y-4 bg-background border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ZoomOut className="h-3.5 w-3.5" /> Zoom</span>
              <span className="font-mono">{zoom.toFixed(2)}×</span>
              <span className="flex items-center gap-1.5">Zoom <ZoomIn className="h-3.5 w-3.5" /></span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-xl"
            >
              <RotateCw className="h-4 w-4" /> Rotation 90°
            </Button>
            <span className="text-[11px] text-muted-foreground">Rotation : {rotation}°</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="rounded-xl text-xs"
            >
              Réinitialiser
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={processing} className="rounded-xl">
              <X className="h-4 w-4" /> Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedArea}
              className="rounded-xl bg-gradient-gold text-secondary-foreground shadow-gold"
            >
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</> : <><Check className="h-4 w-4" /> Appliquer & enregistrer</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Crop helpers ----------
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc: string, area: CropArea, rotation: number): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const radians = (rotation * Math.PI) / 180;

  // Bounding box of rotated source image
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bBoxW = image.width * cos + image.height * sin;
  const bBoxH = image.width * sin + image.height * cos;

  // Render rotated image to a temp canvas
  const tmp = document.createElement("canvas");
  tmp.width = bBoxW;
  tmp.height = bBoxH;
  const tctx = tmp.getContext("2d")!;
  tctx.translate(bBoxW / 2, bBoxH / 2);
  tctx.rotate(radians);
  tctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Extract crop area
  const out = document.createElement("canvas");
  out.width = area.width;
  out.height = area.height;
  const octx = out.getContext("2d")!;
  octx.drawImage(tmp, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Échec du traitement de l'image"));
    }, "image/jpeg", 0.92);
  });
}
