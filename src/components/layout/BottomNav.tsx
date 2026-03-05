import { Home, Search, Sparkles, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated, user, avatarUrl } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Sparkles, label: 'MoodMatch', path: '/mood' },
    { icon: Users, label: 'Friends', path: '/friends' },
  ];

  const profileActive = location.pathname === '/profile';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-lg">
        <div className="glass-card flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className="relative flex flex-col items-center">
                <motion.div
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.div layoutId="nav-indicator" className="absolute -inset-2 rounded-xl bg-primary/20"
                        initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>{item.label}</span>
                </motion.div>
              </NavLink>
            );
          })}

          {/* Profile avatar - no label */}
          <NavLink to="/profile" className="relative flex flex-col items-center">
            <motion.div
              className="flex items-center justify-center px-3 py-2 rounded-xl"
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Avatar className={cn(
                  "h-7 w-7 transition-all",
                  profileActive && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}>
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {isAuthenticated ? (user?.username?.charAt(0).toUpperCase() || 'U') : 'G'}
                  </AvatarFallback>
                </Avatar>
                {profileActive && (
                  <motion.div layoutId="nav-indicator" className="absolute -inset-2 rounded-xl bg-primary/20"
                    initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
              </div>
            </motion.div>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
