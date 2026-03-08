import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageCropModal } from './ImageCropModal';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #667db6 0%, #0082c8 50%, #667db6 100%)',
  'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
];

// Discord-style animated CSS banners stored as a CSS class key
const ANIMATED_PRESETS: { label: string; style: React.CSSProperties; animation: string }[] = [
  {
    label: 'Nitro Shift',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #5865f2, #eb459e, #fee75c, #57f287, #5865f2)',
  },
  {
    label: 'Aurora',
    style: { backgroundSize: '300% 300%' },
    animation: 'linear-gradient(270deg, #0f2027, #203a43, #2c5364, #0f2027)',
  },
  {
    label: 'Sunset Blaze',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #f12711, #f5af19, #f12711)',
  },
  {
    label: 'Ocean Dream',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #2193b0, #6dd5ed, #2193b0)',
  },
  {
    label: 'Neon Glow',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #ff00cc, #333399, #00ccff, #ff00cc)',
  },
  {
    label: 'Cyber Pulse',
    style: { backgroundSize: '300% 300%' },
    animation: 'linear-gradient(270deg, #00f260, #0575e6, #a100ff, #00f260)',
  },
  {
    label: 'Lava Flow',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #ee0979, #ff6a00, #ee0979)',
  },
  {
    label: 'Midnight',
    style: { backgroundSize: '200% 200%' },
    animation: 'linear-gradient(270deg, #232526, #414345, #232526)',
  },
];

// Store animated banners as a special JSON string so we can differentiate them
function encodeAnimatedBanner(gradient: string): string {
  return `animated:${gradient}`;
}

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
        <DialogContent className="sm:max-w-lg" aria-describedby="banner-desc">
          <DialogHeader>
            <DialogTitle>Choose Banner</DialogTitle>
            <DialogDescription id="banner-desc">Pick a gradient, animated banner, or upload your own image.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="animated" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="animated">Animated</TabsTrigger>
              <TabsTrigger value="gradient">Gradient</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            {/* Animated Discord-style */}
            <TabsContent value="animated" className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {ANIMATED_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(encodeAnimatedBanner(preset.animation)); onOpenChange(false); }}
                    className="h-20 rounded-xl transition-transform hover:scale-105 border-2 border-transparent hover:border-primary overflow-hidden relative"
                    style={{
                      background: preset.animation,
                      ...preset.style,
                      animation: 'bannerShift 4s ease infinite',
                    }}
                  >
                    <span className="absolute bottom-1 left-2 text-[10px] font-medium text-white drop-shadow-lg">{preset.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* Static gradients */}
            <TabsContent value="gradient" className="mt-3">
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(bg); onOpenChange(false); }}
                    className="h-16 rounded-xl transition-transform hover:scale-105 border-2 border-transparent hover:border-primary"
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Upload custom */}
            <TabsContent value="upload" className="mt-3">
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">Upload a custom banner image (max 5MB)</p>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose Image</span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Keyframes for animated banners */}
      <style>{`
        @keyframes bannerShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
}
