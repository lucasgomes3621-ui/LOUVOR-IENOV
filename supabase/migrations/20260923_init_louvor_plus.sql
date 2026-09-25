-- ==============================================================================
-- LOUVOR+ — Sistema de Gestão para Ministério de Louvor
-- Migration: 20260923_init_louvor_plus.sql
-- Description: Complete schema, indexes, constraints, triggers, and RLS policies
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MINISTRIES
CREATE TABLE IF NOT EXISTS public.ministries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  church_name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MINISTRY_MEMBERS
CREATE TABLE IF NOT EXISTS public.ministry_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'minister', 'member')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_ministry_user UNIQUE (ministry_id, user_id)
);

-- 4. ROLES (Funções / Instrumentos)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'instrumento', -- 'vocal', 'harmonia', 'ritmo', 'tecnica', 'lideranca'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MEMBER_ROLES
CREATE TABLE IF NOT EXISTS public.member_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_member_id UUID NOT NULL REFERENCES public.ministry_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_member_role UNIQUE (ministry_member_id, role_id)
);

-- 6. SERVICES (Cultos e Eventos)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'Culto de Domingo',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT NOT NULL DEFAULT 'Templo Principal',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SCHEDULES (Escalas)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  repertoire_responsible_id UUID REFERENCES public.ministry_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_service_schedule UNIQUE (service_id)
);

-- 8. SCHEDULE_MEMBERS (Membros escalados e confirmação)
CREATE TABLE IF NOT EXISTS public.schedule_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  ministry_member_id UUID NOT NULL REFERENCES public.ministry_members(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  confirmation_status TEXT NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'declined')),
  response_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_schedule_member_role UNIQUE (schedule_id, ministry_member_id, role_id)
);

-- 9. AVAILABILITY (Disponibilidade dos membros)
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_member_id UUID NOT NULL REFERENCES public.ministry_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable', 'maybe')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_member_date UNIQUE (ministry_member_id, date)
);

-- 10. SONGS (Biblioteca de Louvores)
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  original_key TEXT NOT NULL DEFAULT 'G',
  bpm INTEGER DEFAULT 72,
  category TEXT NOT NULL DEFAULT 'Adoração',
  notes TEXT,
  lyrics_reference TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SONG_LINKS (YouTube, Spotify, etc.)
CREATE TABLE IF NOT EXISTS public.song_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'spotify', 'other')),
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SETLISTS (Repertórios)
CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  responsible_member_id UUID REFERENCES public.ministry_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_service_setlist UNIQUE (service_id)
);

-- 13. SETLIST_SONGS (Músicas no Repertório)
CREATE TABLE IF NOT EXISTS public.setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  key_override TEXT,
  bpm_override INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_setlist_position UNIQUE (setlist_id, position)
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('schedule_created', 'schedule_updated', 'schedule_reminder', 'repertoire_published', 'confirmation', 'declined', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  related_setlist_id UUID REFERENCES public.setlists(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY EFFICIENCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ministry_members_ministry ON public.ministry_members(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_members_user ON public.ministry_members(user_id);
CREATE INDEX IF NOT EXISTS idx_services_ministry_date ON public.services(ministry_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_service ON public.schedules(service_id);
CREATE INDEX IF NOT EXISTS idx_schedules_ministry ON public.schedules(ministry_id);
CREATE INDEX IF NOT EXISTS idx_schedule_members_schedule ON public.schedule_members(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_members_member ON public.schedule_members(ministry_member_id);
CREATE INDEX IF NOT EXISTS idx_availability_member_date ON public.availability(ministry_member_id, date);
CREATE INDEX IF NOT EXISTS idx_songs_ministry_title ON public.songs(ministry_id, title);
CREATE INDEX IF NOT EXISTS idx_songs_ministry_artist ON public.songs(ministry_id, artist);
CREATE INDEX IF NOT EXISTS idx_song_links_song ON public.song_links(song_id);
CREATE INDEX IF NOT EXISTS idx_setlists_service ON public.setlists(service_id);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist_pos ON public.setlist_songs(setlist_id, position);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_ministry_member(p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ministry_members
    WHERE ministry_id = p_ministry_id AND user_id = auth.uid() AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_ministry_admin(p_ministry_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ministry_members
    WHERE ministry_id = p_ministry_id AND user_id = auth.uid() AND role = 'admin' AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: users can read members of same ministry, can edit own profile
CREATE POLICY "Users can read profiles in same ministry" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.ministry_members mm1
      JOIN public.ministry_members mm2 ON mm1.ministry_id = mm2.ministry_id
      WHERE mm1.user_id = auth.uid() AND mm2.user_id = public.profiles.id
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Ministries: accessible by their members
CREATE POLICY "Members can view their ministry" ON public.ministries
  FOR SELECT USING (public.is_ministry_member(id));

CREATE POLICY "Admins can update ministry" ON public.ministries
  FOR UPDATE USING (public.is_ministry_admin(id));

CREATE POLICY "Authenticated users can create ministry" ON public.ministries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Services: members can view; admins can create/update
CREATE POLICY "Members can view services" ON public.services
  FOR SELECT USING (public.is_ministry_member(ministry_id));

CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL USING (public.is_ministry_admin(ministry_id));

-- Schedules: published schedules visible to members; drafts to admins/assigned minister
CREATE POLICY "Members view schedules" ON public.schedules
  FOR SELECT USING (
    public.is_ministry_admin(ministry_id) OR
    status = 'published' OR
    status = 'completed' OR
    repertoire_responsible_id IN (SELECT id FROM public.ministry_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage schedules" ON public.schedules
  FOR ALL USING (public.is_ministry_admin(ministry_id));

-- Schedule members: members can update their own confirmation
CREATE POLICY "Members can view schedule members" ON public.schedule_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_id AND public.is_ministry_member(s.ministry_id))
  );

CREATE POLICY "Members update their own confirmation" ON public.schedule_members
  FOR UPDATE USING (
    ministry_member_id IN (SELECT id FROM public.ministry_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage schedule members" ON public.schedule_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schedules s WHERE s.id = schedule_id AND public.is_ministry_admin(s.ministry_id))
  );

-- Songs & Links: visible to all ministry members, manageable by admin & ministers
CREATE POLICY "Members view songs" ON public.songs
  FOR SELECT USING (public.is_ministry_member(ministry_id));

CREATE POLICY "Admins and Ministers manage songs" ON public.songs
  FOR ALL USING (
    public.is_ministry_admin(ministry_id) OR
    EXISTS (SELECT 1 FROM public.ministry_members WHERE ministry_id = public.songs.ministry_id AND user_id = auth.uid() AND role IN ('admin', 'minister'))
  );

-- Setlists: published visible to all; drafts editable by responsible minister or admin
CREATE POLICY "View setlists" ON public.setlists
  FOR SELECT USING (
    public.is_ministry_member(ministry_id) AND (
      status = 'published' OR
      status = 'archived' OR
      public.is_ministry_admin(ministry_id) OR
      responsible_member_id IN (SELECT id FROM public.ministry_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Manage setlists" ON public.setlists
  FOR ALL USING (
    public.is_ministry_admin(ministry_id) OR
    responsible_member_id IN (SELECT id FROM public.ministry_members WHERE user_id = auth.uid())
  );

-- Notifications: user can view and update their own notifications
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());
