
-- Fix: re-add realtime for group_messages only (dm_messages already exists)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
