import {
  Profile,
  Ministry,
  MinistryMember,
  Role,
  Service,
  Schedule,
  ScheduleMember,
  Availability,
  Song,
  Setlist,
  SetlistSong,
  Notification,
  ActivityLog,
  ConfirmationStatus,
  AvailabilityStatus,
  UserRole,
  ScheduleStatus,
} from '../types/database';
import {
  INITIAL_MINISTRY,
  INITIAL_ROLES,
  INITIAL_PROFILES,
  INITIAL_MEMBERS,
  INITIAL_SONGS,
  INITIAL_SERVICES,
  INITIAL_SCHEDULES,
  INITIAL_SETLISTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AVAILABILITY,
  INITIAL_LOGS,
} from './mockData';
import {
  hashPassword,
  verifyPassword,
  generateTemporaryPassword,
} from '../utils/crypto';

const STORAGE_KEYS = {
  MINISTRY: 'louvor_plus_ministry',
  ROLES: 'louvor_plus_roles',
  PROFILES: 'louvor_plus_profiles',
  MEMBERS: 'louvor_plus_members',
  SONGS: 'louvor_plus_songs',
  SERVICES: 'louvor_plus_services',
  SCHEDULES: 'louvor_plus_schedules',
  SETLISTS: 'louvor_plus_setlists',
  NOTIFICATIONS: 'louvor_plus_notifications',
  AVAILABILITY: 'louvor_plus_availability',
  LOGS: 'louvor_plus_logs',
  CURRENT_USER_ID: 'louvor_plus_current_user_id',
  THEME: 'louvor_plus_theme',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage error', err);
  }
}

class AppStore {
  ministry: Ministry;
  roles: Role[];
  profiles: Profile[];
  members: MinistryMember[];
  songs: Song[];
  services: Service[];
  schedules: Schedule[];
  setlists: Setlist[];
  notifications: Notification[];
  availability: Availability[];
  logs: ActivityLog[];
  currentUserId: string;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ministry = getStorage<Ministry>(STORAGE_KEYS.MINISTRY, INITIAL_MINISTRY);
    if (
      !this.ministry.logo_url ||
      this.ministry.logo_url.includes('unsplash') ||
      this.ministry.name.includes('Graça') ||
      this.ministry.logo_url.includes('kommodo.ai')
    ) {
      this.ministry = {
        ...this.ministry,
        name: 'Ministério de Louvor IENOV',
        church_name: 'IENOV',
        logo_url: '/ienov-logo.png',
      };
      setStorage(STORAGE_KEYS.MINISTRY, this.ministry);
    }
    this.roles = getStorage<Role[]>(STORAGE_KEYS.ROLES, INITIAL_ROLES);
    // Ensure "Ministração" role exists
    if (!this.roles.some((r) => r.name.toLowerCase() === 'ministração' || r.name.toLowerCase() === 'ministracao' || r.id === 'role-ministracao')) {
      this.roles.unshift({
        id: 'role-ministracao',
        ministry_id: this.ministry.id,
        name: 'Ministração',
        category: 'lideranca',
        active: true,
        created_at: new Date().toISOString(),
      });
      setStorage(STORAGE_KEYS.ROLES, this.roles);
    }
    this.profiles = getStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    // Ensure every profile has username and password hash synced
    this.profiles = this.profiles.map((p) => {
      const initial = INITIAL_PROFILES.find((ip) => ip.id === p.id);
      return {
        ...p,
        username: p.username || initial?.username || p.full_name.toLowerCase().replace(/\s+/g, '.'),
        must_change_password: p.must_change_password !== undefined ? p.must_change_password : initial?.must_change_password ?? false,
        password_hash: p.password_hash || initial?.password_hash,
      };
    });

    this.members = getStorage<MinistryMember[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    // Sync roles to match MASTER_ADMIN where applicable
    this.members = this.members.map((m) => {
      const initial = INITIAL_MEMBERS.find((im) => im.id === m.id);
      const profile = this.profiles.find((p) => p.id === m.user_id);
      return {
        ...m,
        role: (m.role === 'admin' ? 'MASTER_ADMIN' : m.role) as UserRole,
        profile: profile || m.profile || initial?.profile,
      };
    });
    this.songs = getStorage<Song[]>(STORAGE_KEYS.SONGS, INITIAL_SONGS);
    this.services = getStorage<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    this.schedules = getStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    this.setlists = getStorage<Setlist[]>(STORAGE_KEYS.SETLISTS, INITIAL_SETLISTS);
    this.notifications = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    this.availability = getStorage<Availability[]>(STORAGE_KEYS.AVAILABILITY, INITIAL_AVAILABILITY);
    this.logs = getStorage<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
    this.currentUserId = getStorage<string>(STORAGE_KEYS.CURRENT_USER_ID, 'user-lucas'); // default Admin
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private saveAll() {
    setStorage(STORAGE_KEYS.MINISTRY, this.ministry);
    setStorage(STORAGE_KEYS.ROLES, this.roles);
    setStorage(STORAGE_KEYS.PROFILES, this.profiles);
    setStorage(STORAGE_KEYS.MEMBERS, this.members);
    setStorage(STORAGE_KEYS.SONGS, this.songs);
    setStorage(STORAGE_KEYS.SERVICES, this.services);
    setStorage(STORAGE_KEYS.SCHEDULES, this.schedules);
    setStorage(STORAGE_KEYS.SETLISTS, this.setlists);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    setStorage(STORAGE_KEYS.AVAILABILITY, this.availability);
    setStorage(STORAGE_KEYS.LOGS, this.logs);
    setStorage(STORAGE_KEYS.CURRENT_USER_ID, this.currentUserId);
    this.notify();
  }

  // --- Auth & User State ---
  getCurrentProfile(): Profile {
    const profile = this.profiles.find((p) => p.id === this.currentUserId);
    return profile || this.profiles[0];
  }

  getCurrentMember(): MinistryMember {
    const member = this.members.find((m) => m.user_id === this.currentUserId);
    return member || this.members[0];
  }

  isMasterAdmin(userId: string = this.currentUserId): boolean {
    const member = this.members.find((m) => m.user_id === userId);
    return member?.role === 'MASTER_ADMIN' || member?.role === 'admin';
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    setStorage(STORAGE_KEYS.CURRENT_USER_ID, userId);
    this.notify();
  }

  /**
   * Login with username or email, and password.
   * Enforces security, active status check and must_change_password flag.
   */
  login(usernameOrEmail: string, password?: string): {
    success: boolean;
    message?: string;
    mustChangePassword?: boolean;
    user?: Profile;
    member?: MinistryMember;
  } {
    const cleanIdent = usernameOrEmail.trim().toLowerCase();
    const user = this.profiles.find(
      (p) => (p.username && p.username.toLowerCase() === cleanIdent) || p.email.toLowerCase() === cleanIdent
    );

    if (!user) {
      return { success: false, message: 'Usuário ou e-mail não encontrado.' };
    }

    if (!user.active) {
      return {
        success: false,
        message: 'Esta conta foi desativada pela liderança. Entre em contato com o Master Admin.',
      };
    }

    const member = this.members.find((m) => m.user_id === user.id);
    if (member && !member.active) {
      return {
        success: false,
        message: 'Acesso desativado para este ministério. Fale com o Master Admin.',
      };
    }

    // Password verification
    if (password !== undefined) {
      const isValid = verifyPassword(password, user.password_hash, user.username);
      if (!isValid) {
        return { success: false, message: 'Senha incorreta. Verifique suas credenciais.' };
      }
    }

    this.setCurrentUser(user.id);
    this.logActivity(`Efetuou login no sistema (${user.username || user.email})`, 'auth', user.id);

    return {
      success: true,
      mustChangePassword: !!user.must_change_password,
      user,
      member,
    };
  }

  /**
   * Change password (required on first member login or requested)
   */
  changePassword(userId: string, newPassword: string): { success: boolean; message?: string } {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'A nova senha deve possuir pelo menos 6 caracteres.' };
    }

    const newHash = hashPassword(newPassword);
    this.profiles = this.profiles.map((p) =>
      p.id === userId
        ? {
            ...p,
            password_hash: newHash,
            must_change_password: false,
            updated_at: new Date().toISOString(),
          }
        : p
    );

    // Update in members cache
    this.members = this.members.map((m) =>
      m.user_id === userId && m.profile
        ? {
            ...m,
            profile: {
              ...m.profile,
              password_hash: newHash,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            },
          }
        : m
    );

    this.logActivity('Alterou e definiu sua própria senha com sucesso', 'auth', userId);
    this.saveAll();
    return { success: true };
  }

  /**
   * Master Admin resets a member's password, generating a temporary one.
   * Enforces must_change_password on their next login.
   */
  resetMemberPassword(memberId: string): { success: boolean; temporaryPassword?: string; message?: string } {
    const targetMember = this.members.find((m) => m.id === memberId);
    if (!targetMember) return { success: false, message: 'Membro não encontrado.' };

    const tempPassword = generateTemporaryPassword();
    const newHash = hashPassword(tempPassword);

    this.profiles = this.profiles.map((p) =>
      p.id === targetMember.user_id
        ? {
            ...p,
            password_hash: newHash,
            must_change_password: true,
            updated_at: new Date().toISOString(),
          }
        : p
    );

    this.members = this.members.map((m) =>
      m.id === memberId && m.profile
        ? {
            ...m,
            profile: {
              ...m.profile,
              password_hash: newHash,
              must_change_password: true,
            },
          }
        : m
    );

    this.logActivity(
      `Redefiniu a senha de ${targetMember.profile?.full_name} (${targetMember.profile?.username})`,
      'security',
      targetMember.id
    );

    // Send a notification to the user
    this.addNotification({
      ministry_id: targetMember.ministry_id,
      user_id: targetMember.user_id,
      type: 'password_reset',
      title: 'Senha Redefinida pelo Administrador',
      message: 'Sua senha foi redefinida pelo líder. Você precisará definir uma nova senha no seu próximo acesso.',
    });

    this.saveAll();
    return { success: true, temporaryPassword: tempPassword };
  }

  /**
   * Deactivate member: sets active = false, preserves all historical schedules, setlists and logs
   */
  deactivateMember(memberId: string): { success: boolean; message?: string } {
    const targetMember = this.members.find((m) => m.id === memberId);
    if (!targetMember) return { success: false, message: 'Membro não encontrado.' };

    if (targetMember.role === 'MASTER_ADMIN') {
      return { success: false, message: 'Não é permitido desativar a conta MASTER_ADMIN principal.' };
    }

    this.members = this.members.map((m) => (m.id === memberId ? { ...m, active: false } : m));
    this.profiles = this.profiles.map((p) => (p.id === targetMember.user_id ? { ...p, active: false } : p));

    this.logActivity(
      `Desativou o membro ${targetMember.profile?.full_name}. Histórico preservado.`,
      'member',
      targetMember.id
    );

    this.saveAll();
    return { success: true };
  }

  /**
   * Reactivate member
   */
  reactivateMember(memberId: string): { success: boolean; message?: string } {
    const targetMember = this.members.find((m) => m.id === memberId);
    if (!targetMember) return { success: false, message: 'Membro não encontrado.' };

    this.members = this.members.map((m) => (m.id === memberId ? { ...m, active: true } : m));
    this.profiles = this.profiles.map((p) => (p.id === targetMember.user_id ? { ...p, active: true } : p));

    this.logActivity(`Reativou o membro ${targetMember.profile?.full_name}`, 'member', targetMember.id);
    this.saveAll();
    return { success: true };
  }

  signUp(name: string, email: string, churchName?: string, ministryName?: string): { success: boolean; profile: Profile } {
    const newId = 'user-' + Date.now();
    const username = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const defaultPassword = 'Louvor@2026';

    const newProfile: Profile = {
      id: newId,
      full_name: name,
      username,
      email: email,
      active: true,
      must_change_password: false,
      password_hash: hashPassword(defaultPassword),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.push(newProfile);

    // If initial ministry was not customized or user entered church name
    if (churchName || ministryName) {
      this.ministry = {
        ...this.ministry,
        name: ministryName || this.ministry.name,
        church_name: churchName || this.ministry.church_name,
        updated_at: new Date().toISOString(),
      };
    }

    const newMember: MinistryMember = {
      id: 'mm-' + Date.now(),
      ministry_id: this.ministry.id,
      user_id: newId,
      role: 'MASTER_ADMIN', // first user is MASTER_ADMIN as required in section 13
      active: true,
      created_at: new Date().toISOString(),
      profile: newProfile,
      roles: [this.roles[0]],
    };
    this.members.push(newMember);

    this.setCurrentUser(newId);
    this.logActivity(`Cadastrou a Conta Master inicial (${username})`, 'auth', newId);
    this.saveAll();
    return { success: true, profile: newProfile };
  }

  /**
   * Section 3: Creation of new member by MASTER_ADMIN
   */
  createMemberByMaster(params: {
    fullName: string;
    username: string;
    initialPassword: string;
    phone?: string;
    primaryRoleId: string;
    otherRoleIds?: string[];
  }): { success: boolean; member?: MinistryMember; message?: string } {
    const cleanUsername = params.username.trim().toLowerCase();

    // Check if username already exists
    const exists = this.profiles.some(
      (p) => p.username && p.username.toLowerCase() === cleanUsername
    );
    if (exists) {
      return { success: false, message: `O nome de usuário "${params.username}" já está em uso.` };
    }

    const newUserId = 'user-' + Date.now();
    const newProfile: Profile = {
      id: newUserId,
      full_name: params.fullName.trim(),
      username: cleanUsername,
      email: `${cleanUsername}@louvorplus.app`,
      phone: params.phone?.trim(),
      avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 50000000)}?auto=format&fit=crop&w=200&q=80`,
      active: true,
      must_change_password: true, // Required on first login as per section 2 and 4
      password_hash: hashPassword(params.initialPassword || 'Louvor@2026'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.push(newProfile);

    // Combine roles
    const allRoleIds = Array.from(new Set([params.primaryRoleId, ...(params.otherRoleIds || [])])).filter(Boolean);
    const assignedRoles = this.roles.filter((r) => allRoleIds.includes(r.id));

    const newMember: MinistryMember = {
      id: 'mm-' + Date.now(),
      ministry_id: this.ministry.id,
      user_id: newUserId,
      role: 'MEMBER', // Enforce MEMBER role as specified in section 3
      active: true,
      created_at: new Date().toISOString(),
      profile: newProfile,
      roles: assignedRoles,
    };
    this.members.push(newMember);

    this.logActivity(
      `Criou o novo membro ${params.fullName} (Usuário: ${cleanUsername})`,
      'member',
      newMember.id
    );

    this.saveAll();
    return { success: true, member: newMember };
  }

  updateProfile(data: Partial<Profile>) {
    const current = this.getCurrentProfile();
    this.profiles = this.profiles.map((p) => (p.id === current.id ? { ...p, ...data, updated_at: new Date().toISOString() } : p));
    // update in members array too
    this.members = this.members.map((m) =>
      m.user_id === current.id ? { ...m, profile: { ...m.profile!, ...data } } : m
    );
    this.saveAll();
  }

  updateMinistry(data: Partial<Ministry>) {
    this.ministry = { ...this.ministry, ...data, updated_at: new Date().toISOString() };
    this.logActivity('Atualizou as informações do ministério', 'ministry', this.ministry.id);
    this.saveAll();
  }

  // --- Roles ---
  addRole(name: string, category: string): Role {
    const newRole: Role = {
      id: 'role-' + Date.now(),
      ministry_id: this.ministry.id,
      name,
      category,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.roles.push(newRole);
    this.saveAll();
    return newRole;
  }

  // --- Members ---
  addMember(name: string, email: string, role: UserRole, roleIds: string[], phone?: string): MinistryMember {
    const newUserId = 'user-' + Date.now();
    const cleanUsername = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const newProfile: Profile = {
      id: newUserId,
      full_name: name,
      username: cleanUsername,
      email,
      phone,
      active: true,
      must_change_password: true,
      password_hash: hashPassword('Louvor@2026'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.push(newProfile);

    const assignedRoles = this.roles.filter((r) => roleIds.includes(r.id));

    const newMember: MinistryMember = {
      id: 'mm-' + Date.now(),
      ministry_id: this.ministry.id,
      user_id: newUserId,
      role,
      active: true,
      created_at: new Date().toISOString(),
      profile: newProfile,
      roles: assignedRoles,
    };
    this.members.push(newMember);

    this.logActivity(`Adicionou ${name} à equipe`, 'member', newMember.id);
    this.saveAll();
    return newMember;
  }

  updateMember(memberId: string, updates: { role?: UserRole; active?: boolean; roleIds?: string[] }) {
    this.members = this.members.map((m) => {
      if (m.id === memberId) {
        const assignedRoles = updates.roleIds ? this.roles.filter((r) => updates.roleIds!.includes(r.id)) : m.roles;
        return {
          ...m,
          role: updates.role ?? m.role,
          active: updates.active ?? m.active,
          roles: assignedRoles,
        };
      }
      return m;
    });
    this.saveAll();
  }

  // --- Services (Cultos) ---
  addService(serviceData: Omit<Service, 'id' | 'ministry_id' | 'created_at' | 'updated_at'>): Service {
    const newService: Service = {
      ...serviceData,
      id: 'srv-' + Date.now(),
      ministry_id: this.ministry.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.services.push(newService);
    this.logActivity(`Criou o culto "${newService.title}"`, 'service', newService.id);
    this.saveAll();
    return newService;
  }

  updateService(serviceId: string, data: Partial<Service>) {
    this.services = this.services.map((s) => (s.id === serviceId ? { ...s, ...data, updated_at: new Date().toISOString() } : s));
    // update attached schedules
    this.schedules = this.schedules.map((sc) => {
      if (sc.service_id === serviceId) {
        return { ...sc, service: { ...sc.service!, ...data } };
      }
      return sc;
    });
    this.saveAll();
  }

  // --- Schedules (Escalas) ---
  createSchedule(params: {
    service_id: string;
    repertoire_responsible_id?: string;
    members: Array<{ member_id: string; role_id: string }>;
    notes?: string;
    status?: 'draft' | 'published';
  }): Schedule {
    const service = this.services.find((s) => s.id === params.service_id);

    // Auto-detect member assigned to "Ministração" role
    const ministracaoItem = params.members.find((item) => {
      const role = this.roles.find((r) => r.id === item.role_id);
      return role?.name?.toLowerCase().includes('ministra') || item.role_id === 'role-ministracao';
    });

    const responsibleId = params.repertoire_responsible_id || ministracaoItem?.member_id || params.members[0]?.member_id;
    const responsible = this.members.find((m) => m.id === responsibleId);

    const scheduleId = 'sch-' + Date.now();
    const scheduleMembers: ScheduleMember[] = params.members.map((item, idx) => {
      const member = this.members.find((m) => m.id === item.member_id);
      const role = this.roles.find((r) => r.id === item.role_id);
      return {
        id: `sm-${Date.now()}-${idx}`,
        schedule_id: scheduleId,
        ministry_member_id: item.member_id,
        role_id: item.role_id,
        confirmation_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member,
        role,
      };
    });

    const isPublished = params.status === 'published';
    const newSchedule: Schedule = {
      id: scheduleId,
      service_id: params.service_id,
      ministry_id: this.ministry.id,
      created_by: this.currentUserId,
      repertoire_responsible_id: responsibleId,
      status: isPublished ? 'published' : 'draft',
      published_at: isPublished ? new Date().toISOString() : undefined,
      notes: params.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service,
      repertoire_responsible: responsible,
      members: scheduleMembers,
    };

    if (params.notes && service) {
      service.notes = params.notes;
    }

    this.schedules.push(newSchedule);

    // Initialize draft setlist for the service with the Ministração as responsible
    if (!this.getSetlistByServiceId(params.service_id)) {
      this.saveSetlist({
        service_id: params.service_id,
        responsible_member_id: responsibleId,
        status: 'draft',
        songs: [],
      });
    }

    if (isPublished) {
      this.notifySchedulePublished(newSchedule);
    }

    this.logActivity(
      `${isPublished ? 'Publicou' : 'Criou rascunho de'} escala para ${service?.title || 'culto'} (Ministração: ${responsible?.profile?.full_name || 'definida'})`,
      'schedule',
      newSchedule.id
    );
    this.saveAll();
    return newSchedule;
  }

  /**
   * Edit/Update an existing schedule (even if already published)
   */
  updateSchedule(
    scheduleId: string,
    params: {
      serviceData?: {
        title?: string;
        date?: string;
        start_time?: string;
        location?: string;
        notes?: string;
      };
      repertoire_responsible_id?: string;
      members?: Array<{ member_id: string; role_id: string }>;
      notes?: string;
      status?: ScheduleStatus;
    }
  ): Schedule | undefined {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return undefined;

    // 1. Update attached service if serviceData provided
    if (params.serviceData && schedule.service_id) {
      this.updateService(schedule.service_id, params.serviceData);
      schedule.service = this.services.find((s) => s.id === schedule.service_id);
    }

    // 2. Update notes
    if (params.notes !== undefined) {
      schedule.notes = params.notes;
      if (schedule.service) {
        schedule.service.notes = params.notes;
      }
    }

    // 3. Update members preserving previous confirmations
    if (params.members) {
      const prevMembers = schedule.members || [];
      const newScheduleMembers: ScheduleMember[] = params.members.map((item, idx) => {
        const prev = prevMembers.find((pm) => pm.ministry_member_id === item.member_id);
        const member = this.members.find((m) => m.id === item.member_id);
        const role = this.roles.find((r) => r.id === item.role_id);
        return {
          id: prev?.id || `sm-${Date.now()}-${idx}`,
          schedule_id: schedule.id,
          ministry_member_id: item.member_id,
          role_id: item.role_id,
          confirmation_status: prev?.confirmation_status || 'pending',
          response_note: prev?.response_note,
          created_at: prev?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          member,
          role,
        };
      });
      schedule.members = newScheduleMembers;
    }

    // 4. Update repertoire responsible (Ministração)
    if (params.repertoire_responsible_id) {
      schedule.repertoire_responsible_id = params.repertoire_responsible_id;
      schedule.repertoire_responsible = this.members.find(
        (m) => m.id === params.repertoire_responsible_id
      );
      const setlist = this.getSetlistByServiceId(schedule.service_id);
      if (setlist) {
        setlist.responsible_member_id = params.repertoire_responsible_id;
        setlist.responsible_member = schedule.repertoire_responsible;
      }
    }

    // 5. Update status
    if (params.status) {
      const wasDraft = schedule.status === 'draft';
      schedule.status = params.status;
      if (params.status === 'published' && wasDraft) {
        schedule.published_at = new Date().toISOString();
        this.notifySchedulePublished(schedule);
      }
    }

    schedule.updated_at = new Date().toISOString();

    this.logActivity(
      `Atualizou a escala para ${schedule.service?.title || 'culto'} (dados atualizados)`,
      'schedule',
      schedule.id
    );

    this.saveAll();
    return schedule;
  }

  deleteSchedule(scheduleId: string): boolean {
    const sch = this.schedules.find((s) => s.id === scheduleId);
    if (!sch) return false;
    this.schedules = this.schedules.filter((s) => s.id !== scheduleId);
    this.logActivity(`Excluiu a escala de ${sch.service?.title || 'culto'}`, 'schedule', scheduleId);
    this.saveAll();
    return true;
  }

  // Helper to check if a member is the Ministração (responsible for choosing songs) for a service/schedule
  isMemberMinistracao(memberId: string, serviceIdOrScheduleId: string): boolean {
    const schedule = this.schedules.find(
      (s) => s.id === serviceIdOrScheduleId || s.service_id === serviceIdOrScheduleId
    );
    if (!schedule) return false;
    if (schedule.repertoire_responsible_id === memberId) return true;
    const sm = schedule.members?.find((m) => m.ministry_member_id === memberId);
    if (sm?.role?.name?.toLowerCase().includes('ministra') || sm?.role_id === 'role-ministracao') {
      return true;
    }
    return false;
  }

  getMinistracaoMember(serviceIdOrScheduleId: string): MinistryMember | undefined {
    const schedule = this.schedules.find(
      (s) => s.id === serviceIdOrScheduleId || s.service_id === serviceIdOrScheduleId
    );
    if (!schedule) return undefined;
    if (schedule.repertoire_responsible) return schedule.repertoire_responsible;
    if (schedule.repertoire_responsible_id) {
      const resp = this.members.find((m) => m.id === schedule.repertoire_responsible_id);
      if (resp) return resp;
    }
    const sm = schedule.members?.find(
      (m) => m.role?.name?.toLowerCase().includes('ministra') || m.role_id === 'role-ministracao'
    );
    if (sm?.member) return sm.member;
    if (sm?.ministry_member_id) return this.members.find((m) => m.id === sm.ministry_member_id);
    return undefined;
  }

  publishSchedule(scheduleId: string) {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    schedule.status = 'published';
    schedule.published_at = new Date().toISOString();
    schedule.updated_at = new Date().toISOString();

    this.notifySchedulePublished(schedule);
    this.logActivity(`Publicou a escala para ${schedule.service?.title}`, 'schedule', schedule.id);
    this.saveAll();
  }

  updateScheduleConfirmation(scheduleId: string, memberId: string, status: ConfirmationStatus, note?: string) {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule || !schedule.members) return;

    const sm = schedule.members.find((m) => m.ministry_member_id === memberId);
    if (sm) {
      sm.confirmation_status = status;
      sm.response_note = note;
      sm.updated_at = new Date().toISOString();

      const member = this.members.find((m) => m.id === memberId);
      const memberName = member?.profile?.full_name || 'Membro';

      // Notify admins
      const adminMembers = this.members.filter((m) => m.role === 'admin');
      adminMembers.forEach((adm) => {
        this.addNotification({
          user_id: adm.user_id,
          ministry_id: this.ministry.id,
          type: status === 'confirmed' ? 'confirmation' : 'declined',
          title: status === 'confirmed' ? `✅ ${memberName} confirmou escala` : `🔴 ${memberName} recusou escala`,
          message:
            status === 'confirmed'
              ? `${memberName} confirmou presença para ${schedule.service?.title}.`
              : `${memberName} informou que não poderá participar: "${note || 'Sem observação'}"`,
          related_service_id: schedule.service_id,
        });
      });

      this.logActivity(
        `${memberName} ${status === 'confirmed' ? 'confirmou' : 'recusou'} presença na escala`,
        'confirmation',
        scheduleId
      );
      this.saveAll();
    }
  }

  private notifySchedulePublished(schedule: Schedule) {
    if (!schedule.members) return;
    schedule.members.forEach((sm) => {
      const member = this.members.find((m) => m.id === sm.ministry_member_id);
      if (member) {
        const isResp = schedule.repertoire_responsible_id === member.id;
        const isMinistracao = sm.role?.name?.toLowerCase().includes('ministra') || sm.role_id === 'role-ministracao' || isResp;
        this.addNotification({
          user_id: member.user_id,
          ministry_id: this.ministry.id,
          type: 'schedule_created',
          title: isMinistracao ? '🎤 Você é a Ministração do Culto!' : '📅 Nova Escala Publicada!',
          message: isMinistracao
            ? `Você foi escalado como Ministração no ${schedule.service?.title} (${schedule.service?.date}). Você é o responsável pelo louvor e por escolher o repertório de músicas!`
            : `Você foi escalado para ${schedule.service?.title} (${schedule.service?.date}). Por favor confirme sua presença.`,
          related_service_id: schedule.service_id,
        });
      }
    });
  }

  // --- Setlists & Songs in Setlist ---
  getSetlistByServiceId(serviceId: string): Setlist | undefined {
    return this.setlists.find((s) => s.service_id === serviceId);
  }

  saveSetlist(params: {
    service_id: string;
    responsible_member_id?: string;
    status: 'draft' | 'published';
    songs: Array<{
      song_id: string;
      position: number;
      key_override?: string;
      bpm_override?: number;
      notes?: string;
    }>;
  }): Setlist {
    const existing = this.setlists.find((s) => s.service_id === params.service_id);
    const service = this.services.find((s) => s.id === params.service_id);
    const responsible = this.members.find((m) => m.id === params.responsible_member_id);

    const setlistId = existing ? existing.id : 'set-' + Date.now();

    const setlistSongs: SetlistSong[] = params.songs.map((item, idx) => {
      const song = this.songs.find((sg) => sg.id === item.song_id);
      return {
        id: `ss-${Date.now()}-${idx}`,
        setlist_id: setlistId,
        song_id: item.song_id,
        position: idx + 1,
        key_override: item.key_override || song?.original_key,
        bpm_override: item.bpm_override || song?.bpm,
        notes: item.notes,
        created_at: new Date().toISOString(),
        song,
      };
    });

    const isPublishing = params.status === 'published';

    const updatedSetlist: Setlist = {
      id: setlistId,
      ministry_id: this.ministry.id,
      service_id: params.service_id,
      responsible_member_id: params.responsible_member_id,
      status: params.status,
      published_at: isPublishing ? new Date().toISOString() : existing?.published_at,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service,
      responsible_member: responsible,
      songs: setlistSongs,
    };

    if (existing) {
      this.setlists = this.setlists.map((s) => (s.id === setlistId ? updatedSetlist : s));
    } else {
      this.setlists.push(updatedSetlist);
    }

    // Also update song last_used_date
    if (isPublishing && service?.date) {
      params.songs.forEach((s) => {
        this.songs = this.songs.map((sg) => (sg.id === s.song_id ? { ...sg, last_used_date: service.date } : sg));
      });
    }

    if (isPublishing) {
      // notify team of this schedule
      const schedule = this.schedules.find((sc) => sc.service_id === params.service_id);
      if (schedule && schedule.members) {
        schedule.members.forEach((sm) => {
          const m = this.members.find((mem) => mem.id === sm.ministry_member_id);
          if (m) {
            this.addNotification({
              user_id: m.user_id,
              ministry_id: this.ministry.id,
              type: 'repertoire_published',
              title: '🎵 Repertório Definido!',
              message: `O repertório do culto "${service?.title}" foi publicado com ${setlistSongs.length} músicas.`,
              related_service_id: params.service_id,
              related_setlist_id: setlistId,
            });
          }
        });
      }
    }

    this.logActivity(
      `${isPublishing ? 'Publicou' : 'Salvou rascunho do'} repertório para ${service?.title}`,
      'setlist',
      setlistId
    );
    this.saveAll();
    return updatedSetlist;
  }

  // --- Song Library ---
  addSong(songData: {
    title: string;
    artist: string;
    original_key: string;
    bpm?: number;
    category: string;
    notes?: string;
    lyrics_reference?: string;
    youtube_url?: string;
    spotify_url?: string;
  }): Song {
    const songId = 'song-' + Date.now();
    const links = [];
    if (songData.youtube_url?.trim()) {
      links.push({
        id: `link-${Date.now()}-yt`,
        song_id: songId,
        platform: 'youtube' as const,
        url: songData.youtube_url.trim(),
        label: 'YouTube',
        created_at: new Date().toISOString(),
      });
    }
    if (songData.spotify_url?.trim()) {
      links.push({
        id: `link-${Date.now()}-sp`,
        song_id: songId,
        platform: 'spotify' as const,
        url: songData.spotify_url.trim(),
        label: 'Spotify',
        created_at: new Date().toISOString(),
      });
    }

    const newSong: Song = {
      id: songId,
      ministry_id: this.ministry.id,
      title: songData.title,
      artist: songData.artist,
      original_key: songData.original_key || 'G',
      bpm: songData.bpm,
      category: songData.category || 'Adoração',
      notes: songData.notes,
      lyrics_reference: songData.lyrics_reference,
      active: true,
      created_by: this.currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      links,
    };

    this.songs.unshift(newSong);
    this.logActivity(`Adicionou o louvor "${newSong.title}" à biblioteca`, 'song', newSong.id);
    this.saveAll();
    return newSong;
  }

  updateSong(songId: string, updates: Partial<Song> & { youtube_url?: string; spotify_url?: string }) {
    this.songs = this.songs.map((song) => {
      if (song.id === songId) {
        const links = [...(song.links || [])];
        if (updates.youtube_url !== undefined) {
          const ytIdx = links.findIndex((l) => l.platform === 'youtube');
          if (updates.youtube_url.trim()) {
            if (ytIdx >= 0) links[ytIdx].url = updates.youtube_url.trim();
            else links.push({ id: 'yt-' + Date.now(), song_id: songId, platform: 'youtube', url: updates.youtube_url.trim(), created_at: new Date().toISOString() });
          } else if (ytIdx >= 0) {
            links.splice(ytIdx, 1);
          }
        }
        if (updates.spotify_url !== undefined) {
          const spIdx = links.findIndex((l) => l.platform === 'spotify');
          if (updates.spotify_url.trim()) {
            if (spIdx >= 0) links[spIdx].url = updates.spotify_url.trim();
            else links.push({ id: 'sp-' + Date.now(), song_id: songId, platform: 'spotify', url: updates.spotify_url.trim(), created_at: new Date().toISOString() });
          } else if (spIdx >= 0) {
            links.splice(spIdx, 1);
          }
        }

        return {
          ...song,
          ...updates,
          links,
          updated_at: new Date().toISOString(),
        };
      }
      return song;
    });
    this.saveAll();
  }

  // --- Availability ---
  setAvailability(date: string, status: AvailabilityStatus, note?: string) {
    const currentMember = this.getCurrentMember();
    const existingIdx = this.availability.findIndex(
      (a) => a.ministry_member_id === currentMember.id && a.date === date
    );

    if (existingIdx >= 0) {
      this.availability[existingIdx] = {
        ...this.availability[existingIdx],
        status,
        note,
        updated_at: new Date().toISOString(),
      };
    } else {
      this.availability.push({
        id: 'av-' + Date.now(),
        ministry_member_id: currentMember.id,
        date,
        status,
        note,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member: currentMember,
      });
    }

    this.saveAll();
  }

  getMemberAvailability(memberId: string, date: string): Availability | undefined {
    return this.availability.find((a) => a.ministry_member_id === memberId && a.date === date);
  }

  // --- Notifications ---
  addNotification(notif: Omit<Notification, 'id' | 'created_at'>) {
    const newNotif: Notification = {
      ...notif,
      id: 'notif-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    this.saveAll();
  }

  markNotificationAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read_at: new Date().toISOString() } : n
    );
    this.saveAll();
  }

  markAllNotificationsAsRead() {
    const now = new Date().toISOString();
    this.notifications = this.notifications.map((n) =>
      n.user_id === this.currentUserId && !n.read_at ? { ...n, read_at: now } : n
    );
    this.saveAll();
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter(
      (n) => n.user_id === this.currentUserId && !n.read_at
    ).length;
  }

  // --- Activity Log ---
  logActivity(action: string, entity_type: string, entity_id?: string) {
    const currentProfile = this.getCurrentProfile();
    const newLog: ActivityLog = {
      id: 'log-' + Date.now(),
      ministry_id: this.ministry.id,
      user_id: currentProfile.id,
      user_name: currentProfile.full_name,
      action,
      entity_type,
      entity_id,
      created_at: new Date().toISOString(),
    };
    this.logs.unshift(newLog);
  }

  // Reset to initial demo data
  resetDemoData() {
    localStorage.clear();
    this.ministry = INITIAL_MINISTRY;
    this.roles = INITIAL_ROLES;
    this.profiles = INITIAL_PROFILES;
    this.members = INITIAL_MEMBERS;
    this.songs = INITIAL_SONGS;
    this.services = INITIAL_SERVICES;
    this.schedules = INITIAL_SCHEDULES;
    this.setlists = INITIAL_SETLISTS;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.availability = INITIAL_AVAILABILITY;
    this.logs = INITIAL_LOGS;
    this.currentUserId = 'user-lucas';
    this.saveAll();
  }
}

export const store = new AppStore();
