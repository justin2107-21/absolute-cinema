import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px] opacity-50" />
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-accent/20 rounded-full blur-[80px] opacity-30" />
        <div className="absolute -bottom-20 right-1/3 w-40 h-40 bg-cinema-blue/20 rounded-full blur-[60px] opacity-40" />
      </div>
      
      {/* Main content */}
      <main className="relative z-10 pb-24">
        {children}
      </main>
      
      {!hideNav && <BottomNav />}
    </div>
  );
}
