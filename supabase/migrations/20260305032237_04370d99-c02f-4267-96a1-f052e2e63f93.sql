
-- Group conversations
CREATE TABLE IF NOT EXISTS public.group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Group Chat',
  icon_url text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_conversations ENABLE ROW LEVEL SECURITY;

-- Group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Group messages
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Chat nicknames table
CREATE TABLE IF NOT EXISTS public.chat_nicknames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nickname text NOT NULL,
  set_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.chat_nicknames ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view nicknames in their convos" ON public.chat_nicknames
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_conversations dc WHERE dc.id = chat_nicknames.conversation_id AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())));

CREATE POLICY "Users can set nicknames" ON public.chat_nicknames
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = set_by);

CREATE POLICY "Users can update nicknames they set" ON public.chat_nicknames
  FOR UPDATE TO authenticated
  USING (auth.uid() = set_by);

CREATE POLICY "Users can delete nicknames they set" ON public.chat_nicknames
  FOR DELETE TO authenticated
  USING (auth.uid() = set_by);

CREATE POLICY "Members can view group" ON public.group_conversations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid()));

CREATE POLICY "Authenticated users can create groups" ON public.group_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admin can update" ON public.group_conversations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

CREATE POLICY "Group admin can delete" ON public.group_conversations
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Members can view members" ON public.group_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()));

CREATE POLICY "Admin can add members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin') OR NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id));

CREATE POLICY "Admin can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin') OR auth.uid() = user_id);

CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

CREATE POLICY "Members can send group messages" ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users upload chat files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone view chat files" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments');

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
