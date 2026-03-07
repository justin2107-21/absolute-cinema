import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  activity_visibility: 'friends' | 'hidden';
  chat_permissions: 'everyone' | 'friends';
  friend_request_permissions: 'everyone' | 'friends';
}

const DEFAULTS: PrivacySettings = {
  profile_visibility: 'public',
  activity_visibility: 'friends',
  chat_permissions: 'friends',
  friend_request_permissions: 'everyone',
};

export function usePrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('privacy_settings' as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings({
        profile_visibility: (data as any).profile_visibility || 'public',
        activity_visibility: (data as any).activity_visibility || 'friends',
        chat_permissions: (data as any).chat_permissions || 'friends',
        friend_request_permissions: (data as any).friend_request_permissions || 'everyone',
      });
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const update = async (updates: Partial<PrivacySettings>) => {
    if (!user) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    const { error } = await supabase
      .from('privacy_settings' as any)
      .upsert({ user_id: user.id, ...newSettings } as any, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to save privacy settings');
      load(); // revert
    } else {
      toast.success('Privacy settings updated');
    }
  };

  return { settings, isLoading, update };
}
