import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageCropModal } from './ImageCropModal';
import { toast } from 'sonner';

const BANNER_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(135deg, #667db6 0%, #0082c8 50%, #0082c8 51%, #667db6 100%)',
  'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
}

export function BannerSelector({ open, onOpenChange, onSelect }: Props) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {BANNER_PRESETS.map((bg, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(bg); onOpenChange(false); }}
                  className="h-16 rounded-xl transition-transform hover:scale-105 border-2 border-transparent hover:border-primary"
                  style={{ background: bg }}
                />
              ))}
            </div>
            <div className="text-center">
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>Upload Custom Banner</span>
                </Button>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          onOpenChange={() => setCropSrc(null)}
          imageSrc={cropSrc}
          aspect={3}
          onCropComplete={(dataUrl) => {
            onSelect(dataUrl);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
