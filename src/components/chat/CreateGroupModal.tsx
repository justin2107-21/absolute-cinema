import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { FriendProfile } from '@/hooks/useFriends';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: FriendProfile[];
  onGroupCreated: (groupId: string, groupName: string) => void;
}

export function CreateGroupModal({ open, onOpenChange, friends, onGroupCreated }: Props) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!user || !groupName.trim() || selected.length === 0) {
      toast.error('Please name the group and select members');
      return;
    }
    setCreating(true);

    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('group_conversations')
        .insert({ name: groupName.trim(), created_by: user.id })
        .select('id')
        .single();

      if (groupError || !group) {
        console.error('Group creation error:', groupError);
        toast.error('Failed to create group');
        setCreating(false);
        return;
      }

      const gid = group.id;

      // Add creator as admin first
      const { error: adminError } = await supabase
        .from('group_members')
        .insert({ group_id: gid, user_id: user.id, role: 'admin' });

      if (adminError) {
        console.error('Admin insert error:', adminError);
      }

      // Add selected members one by one to avoid batch issues
      for (const uid of selected) {
        await supabase
          .from('group_members')
          .insert({ group_id: gid, user_id: uid, role: 'member' });
      }

      setCreating(false);
      setGroupName('');
      setSelected([]);
      onGroupCreated(gid, groupName.trim());
      toast.success('Group created!');
    } catch (err) {
      console.error('Group creation failed:', err);
      toast.error('Failed to create group');
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Group name" value={groupName} onChange={e => setGroupName(e.target.value)} />
          <p className="text-xs text-muted-foreground font-medium">Select members</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Add friends first to create a group</p>
            ) : (
              friends.map(f => (
                <label key={f.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 cursor-pointer">
                  <Checkbox checked={selected.includes(f.user_id)} onCheckedChange={() => toggle(f.user_id)} />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={f.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{f.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{f.username || 'User'}</span>
                </label>
              ))
            )}
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={creating || !groupName.trim() || selected.length === 0}>
            {creating ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
