import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageCropModal } from './ImageCropModal';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Video, Loader2 } from 'lucide-react';

// Each animated preset uses a real image with a CSS animation type
const ANIMATED_PRESETS: { label: string; image: string; animation: string }[] = [
  { label: 'Cosmic Nebula', image: '/banners/cosmic-nebula.jpg', animation: 'slowZoom' },
  { label: 'Neon City', image: '/banners/neon-city.jpg', animation: 'slowPan' },
  { label: 'Aurora', image: '/banners/aurora.jpg', animation: 'slowZoom' },
  { label: 'Ocean Sunset', image: '/banners/ocean-sunset.jpg', animation: 'slowPan' },
  { label: 'Enchanted Forest', image: '/banners/enchanted-forest.jpg', animation: 'slowZoom' },
  { label: 'Lava Flow', image: '/banners/lava-flow.jpg', animation: 'slowPulse' },
  { label: 'Chrome Waves', image: '/banners/chrome-waves.jpg', animation: 'slowPan' },
  { label: 'Sakura', image: '/banners/sakura.jpg', animation: 'slowZoom' },
];

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

// Encode animated banner as JSON so we can parse it on the profile page
export function encodeAnimatedBanner(image: string, animation: string): string {
  return `animated:${JSON.stringify({ image, animation })}`;
}

export function parseAnimatedBanner(value: string): { image: string; animation: string } | null {
  if (!value.startsWith('animated:')) return null;
  try {
    return JSON.parse(value.replace('animated:', ''));
  } catch {
    return null;
  }
}

export function isVideoBanner(value: string): boolean {
  return value.startsWith('video:');
}

export function getVideoBannerUrl(value: string): string {
  return value.replace('video:', '');
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
}

export function BannerSelector({ open, onOpenChange, onSelect }: Props) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'video/mp4') {
      toast.error('Only MP4 videos are allowed');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Video must be under 20MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('profile-banners')
        .upload(fileName, file, { contentType: 'video/mp4', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-banners')
        .getPublicUrl(fileName);

      onSelect(`video:${urlData.publicUrl}`);
      onOpenChange(false);
      toast.success('Video banner uploaded!');
    } catch (err: any) {
      toast.error('Failed to upload video: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" aria-describedby="banner-desc">
          <DialogHeader>
            <DialogTitle>Choose Banner</DialogTitle>
            <DialogDescription id="banner-desc">Pick a live wallpaper, gradient, or upload your own image/video.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="animated" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="animated">Live</TabsTrigger>
              <TabsTrigger value="gradient">Gradient</TabsTrigger>
              <TabsTrigger value="upload">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
            </TabsList>

            {/* Live wallpaper presets */}
            <TabsContent value="animated" className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {ANIMATED_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(encodeAnimatedBanner(preset.image, preset.animation)); onOpenChange(false); }}
                    className="h-20 rounded-xl transition-transform hover:scale-105 border-2 border-transparent hover:border-primary overflow-hidden relative"
                  >
                    <img
                      src={preset.image}
                      alt={preset.label}
                      className={`w-full h-full object-cover banner-anim-${preset.animation}`}
                    />
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

            {/* Upload custom image */}
            <TabsContent value="upload" className="mt-3">
              <div className="text-center py-8 space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload a custom banner image (max 5MB)</p>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose Image</span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </TabsContent>

            {/* Upload MP4 video */}
            <TabsContent value="video" className="mt-3">
              <div className="text-center py-8 space-y-3">
                <Video className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Upload an MP4 video as a live wallpaper banner (max 20MB)</p>
                <p className="text-xs text-muted-foreground">Short looping videos (5-15s) work best</p>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span className="flex items-center gap-2">
                      {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {uploading ? 'Uploading...' : 'Choose Video'}
                    </span>
                  </Button>
                  <input type="file" accept="video/mp4" className="hidden" onChange={handleVideoUpload} disabled={uploading} />
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

      {/* Keyframes for live wallpaper animations */}
      <style>{`
        @keyframes bannerSlowZoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes bannerSlowPan {
          0% { transform: scale(1.2) translateX(-5%); }
          50% { transform: scale(1.2) translateX(5%); }
          100% { transform: scale(1.2) translateX(-5%); }
        }
        @keyframes bannerSlowPulse {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.15); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .banner-anim-slowZoom {
          animation: bannerSlowZoom 12s ease-in-out infinite;
        }
        .banner-anim-slowPan {
          animation: bannerSlowPan 14s ease-in-out infinite;
        }
        .banner-anim-slowPulse {
          animation: bannerSlowPulse 10s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
