import { motion } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  Bookmark, 
  Check, 
  Users,
  ChevronRight,
  Star,
  Film
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const { watchlist, watched } = useWatchlist();

  const stats = [
    { label: 'Watchlist', value: watchlist.length, icon: Bookmark },
    { label: 'Watched', value: watched.length, icon: Check },
    { label: 'Friends', value: 0, icon: Users },
  ];

  const menuItems = [
    { label: 'My Watchlist', icon: Bookmark, onClick: () => navigate('/watchlist') },
    { label: 'Watch History', icon: Film, onClick: () => navigate('/watchlist') },
    { label: 'Friends', icon: Users, onClick: () => navigate('/friends') },
    { label: 'Settings', icon: Settings, onClick: () => {} },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        {/* Header */}
        <header className="px-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            Profile
          </motion.h1>
        </header>

        {/* Profile Card */}
        <section className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 text-center space-y-4"
          >
            <div className="relative inline-block">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
                <User className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-cinema-green flex items-center justify-center border-4 border-background">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold">Guest User</h2>
              <p className="text-sm text-muted-foreground">Movie enthusiast</p>
            </div>

            <Button onClick={() => navigate('/auth')}>
              Sign in for full features
            </Button>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="px-4">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-4 text-center"
                >
                  <Icon className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Average Rating */}
        {watched.length > 0 && (
          <section className="px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
                <div className="text-xl font-bold">
                  {(
                    watched.reduce((acc, m) => acc + (m.vote_average || 0), 0) /
                    watched.length
                  ).toFixed(1)}
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Menu */}
        <section className="px-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={item.onClick}
                className="glass-card w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            );
          })}
        </section>

        {/* Sign Out */}
        <section className="px-4 pb-8">
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
