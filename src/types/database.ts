export type UserRole =
  | 'MASTER_ADMIN'
  | 'ADMIN'
  | 'MINISTER'
  | 'MEMBER'
  | 'admin'
  | 'minister'
  | 'member';

export type ServiceStatus = 'scheduled' | 'completed' | 'cancelled';
export type ScheduleStatus = 'draft' | 'published' | 'completed';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'declined';
export type AvailabilityStatus = 'available' | 'unavailable' | 'maybe';
export type SetlistStatus = 'draft' | 'published' | 'archived';
export type SongPlatform = 'youtube' | 'spotify' | 'other';
export type NotificationType =
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_reminder'
  | 'repertoire_published'
  | 'confirmation'
  | 'declined'
  | 'password_reset'
  | 'general';

export interface Profile {
  id: string;
  full_name: string;
  username: string; // e.g., 'lider.master', 'joao.silva'
  email: string;
  phone?: string;
  avatar_url?: string;
  active: boolean;
  must_change_password?: boolean; // Required for member's first login
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Ministry {
  id: string;
  name: string;
  church_name: string;
  logo_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MinistryMember {
  id: string;
  ministry_id: string;
  user_id: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  profile?: Profile;
  roles?: Role[];
}

export interface Role {
  id: string;
  ministry_id: string;
  name: string;
  category: 'vocal' | 'harmonia' | 'ritmo' | 'tecnica' | 'lideranca' | string;
  active: boolean;
  created_at: string;
}

export interface MemberRole {
  id: string;
  ministry_member_id: string;
  role_id: string;
  created_at: string;
}

export interface Service {
  id: string;
  ministry_id: string;
  title: string;
  service_type: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time?: string;
  location: string;
  notes?: string;
  status: ServiceStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleMember {
  id: string;
  schedule_id: string;
  ministry_member_id: string;
  role_id?: string;
  confirmation_status: ConfirmationStatus;
  response_note?: string;
  created_at: string;
  updated_at: string;
  member?: MinistryMember;
  role?: Role;
}

export interface Schedule {
  id: string;
  service_id: string;
  ministry_id: string;
  created_by?: string;
  repertoire_responsible_id?: string;
  status: ScheduleStatus;
  published_at?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  repertoire_responsible?: MinistryMember;
  members?: ScheduleMember[];
  setlist?: Setlist;
  notes?: string;
}

export interface Availability {
  id: string;
  ministry_member_id: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  note?: string;
  created_at: string;
  updated_at: string;
  member?: MinistryMember;
}

export interface SongLink {
  id: string;
  song_id: string;
  platform: SongPlatform;
  url: string;
  label?: string;
  created_at: string;
}

export interface Song {
  id: string;
  ministry_id: string;
  title: string;
  artist: string;
  original_key: string;
  bpm?: number;
  category: string;
  notes?: string;
  lyrics_reference?: string;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  links?: SongLink[];
  last_used_date?: string;
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  key_override?: string;
  bpm_override?: number;
  notes?: string;
  created_at: string;
  song?: Song;
}

export interface Setlist {
  id: string;
  ministry_id: string;
  service_id: string;
  responsible_member_id?: string;
  status: SetlistStatus;
  published_at?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  responsible_member?: MinistryMember;
  songs?: SetlistSong[];
}

export interface Notification {
  id: string;
  user_id: string;
  ministry_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_service_id?: string;
  related_setlist_id?: string;
  read_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  ministry_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  created_at: string;
}
