import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, UserPlus, MessageCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function Friends() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        {/* Header */}
        <header className="px-4 space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold flex items-center gap-2"
          >
            <Users className="h-6 w-6 text-primary" />
            Friends
          </motion.h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
        </header>

        {/* Empty State */}
        <section className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No friends yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">
              Connect with friends to see what they're watching and plan movie nights together
            </p>
          </motion.div>
        </section>

        {/* Quick Actions */}
        <section className="px-4 space-y-3">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card w-full p-4 flex items-center gap-3 text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Invite Friends</h3>
              <p className="text-xs text-muted-foreground">
                Share a link to invite friends
              </p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card w-full p-4 flex items-center gap-3 text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Activity Feed</h3>
              <p className="text-xs text-muted-foreground">
                See what friends are watching
              </p>
            </div>
          </motion.button>
        </section>

        {/* Sign in prompt */}
        <section className="px-4 pb-8">
          <div className="glass-card p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Sign in to add friends and share your movie journey
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
