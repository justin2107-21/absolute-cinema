import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Sparkles, Film } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  members: number;
  movies: number;
}

export default function Groups() {
  const navigate = useNavigate();
  const [groups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = () => {
    // This would connect to Supabase in the full implementation
    setShowCreate(false);
    setNewGroupName('');
  };

  return (
    <AppLayout>
      <div className="space-y-6 pt-4">
        {/* Header */}
        <header className="px-4 space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold flex items-center gap-2"
          >
            <Users className="h-6 w-6 text-primary" />
            Group Watchlists
          </motion.h1>
          <p className="text-sm text-muted-foreground">
            Plan movie nights with friends
          </p>
        </header>

        {/* Create Group */}
        {showCreate ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4"
          >
            <div className="glass-card p-4 space-y-4">
              <h3 className="font-semibold">Create New Group</h3>
              <Input
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleCreateGroup}>
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.section>
        ) : (
          <section className="px-4">
            <Button
              className="w-full gap-2"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Create New Group
            </Button>
          </section>
        )}

        {/* Matchmaker Feature */}
        <section className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-4 bg-gradient-to-br from-primary/20 to-accent/10"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Matchmaker</h3>
                <p className="text-sm text-muted-foreground">
                  Find movies everyone wants to watch
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a group and add friends to discover movies that match everyone's tastes!
            </p>
            <Button variant="accent" className="w-full">
              Try Matchmaker
            </Button>
          </motion.div>
        </section>

        {/* Groups List */}
        <section className="px-4 space-y-4">
          <h2 className="font-semibold">Your Groups</h2>
          
          {groups.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No groups yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Create a group to start planning movie nights with friends
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.members} members • {group.movies} movies
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Info Card */}
        <section className="px-4 pb-8">
          <div className="glass-card p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Sign in to save your groups and invite friends
            </p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
