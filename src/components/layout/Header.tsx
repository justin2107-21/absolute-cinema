import { useNavigate } from 'react-router-dom';
import { LogIn, Bookmark } from 'lucide-react';
import { Logo } from '@/components/branding/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo onClick={() => navigate('/')} />
        
        {isAuthenticated ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/watchlist')}
            className="h-9 w-9"
          >
            <Bookmark className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
