import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

// Using Tenor's anonymous API (free, no key required for limited use)
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor API key

async function searchGifs(query: string): Promise<string[]> {
  try {
    const endpoint = query.trim()
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=20&media_filter=tinygif`
      : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=tinygif`;
    const res = await fetch(endpoint);
    const data = await res.json();
    return (data.results || []).map((r: any) => r.media_formats?.tinygif?.url || r.media_formats?.gif?.url).filter(Boolean);
  } catch {
    return [];
  }
}

export function GifPicker({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timeout = setTimeout(async () => {
      const results = await searchGifs(query);
      setGifs(results);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-1 bg-background border border-border rounded-xl shadow-xl z-50 max-h-80 flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 p-2 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="h-7 text-xs border-0 focus-visible:ring-0 p-0"
            autoFocus
          />
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading GIFs...</div>
          ) : gifs.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">No GIFs found</div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {gifs.map((url, i) => (
                <button key={i} onClick={() => { onSelect(url); onClose(); }}
                  className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity aspect-video bg-muted">
                  <img src={url} alt="GIF" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-center py-1 border-t border-border">
          <span className="text-[9px] text-muted-foreground">Powered by Tenor</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
