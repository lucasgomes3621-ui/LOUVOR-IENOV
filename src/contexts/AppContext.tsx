import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { store } from '../services/store';
import { Profile, Ministry, MinistryMember, UserRole } from '../types/database';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: Profile;
  member: MinistryMember;
  ministry: Ministry;
  role: UserRole;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isMinister: boolean;
  isMemberOnly: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedScheduleId: string | null;
  setSelectedScheduleId: (id: string | null) => void;
  selectedSetlistId: string | null;
  setSelectedSetlistId: (id: string | null) => void;
  unreadCount: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  switchUser: (userId: string) => void;
  login: (usernameOrEmail: string, password?: string) => { success: boolean; message?: string; mustChangePassword?: boolean };
  changePassword: (newPassword: string) => { success: boolean; message?: string };
  signUp: (name: string, email: string, churchName?: string, ministryName?: string) => void;
  logout: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  openNewMemberModal: boolean;
  setOpenNewMemberModal: (open: boolean) => void;
  isUserMinistracaoForService: (serviceId: string) => boolean;
  isUserMinistracaoForSchedule: (scheduleId: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Subscribe to store updates
  useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.currentUserId + store.notifications.length + store.schedules.length + store.songs.length + store.setlists.length + store.members.length
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('louvor_plus_logged_out') !== 'true';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string | null>(null);
  const [openNewMemberModal, setOpenNewMemberModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Theme management
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('louvor_plus_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // dark as default for worship aesthetics
  });

  useEffect(() => {
    localStorage.setItem('louvor_plus_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const user = store.getCurrentProfile();
  const member = store.getCurrentMember();
  const ministry = store.ministry;
  const role = member?.role || 'MEMBER';

  const isMasterAdmin = role === 'MASTER_ADMIN' || role === 'admin';
  const isAdmin = isMasterAdmin; // synonym for admin permissions
  const isMinister = role === 'MINISTER' || role === 'minister' || isMasterAdmin;
  const isMemberOnly = role === 'MEMBER' || role === 'member';

  const mustChangePassword = !!user?.must_change_password;
  const unreadCount = store.getUnreadNotificationsCount();

  const isUserMinistracaoForService = (serviceId: string): boolean => {
    if (!member) return false;
    return store.isMemberMinistracao(member.id, serviceId);
  };

  const isUserMinistracaoForSchedule = (scheduleId: string): boolean => {
    if (!member) return false;
    return store.isMemberMinistracao(member.id, scheduleId);
  };

  const switchUser = (userId: string) => {
    store.setCurrentUser(userId);
    setIsAuthenticated(true);
    localStorage.removeItem('louvor_plus_logged_out');
    const newProfile = store.profiles.find((p) => p.id === userId);
    showToast(`Alternou para perfil de ${newProfile?.full_name} (@${newProfile?.username})`, 'info');
  };

  const login = (usernameOrEmail: string, password?: string) => {
    const res = store.login(usernameOrEmail, password);
    if (res.success) {
      setIsAuthenticated(true);
      localStorage.removeItem('louvor_plus_logged_out');
      showToast(`Bem-vindo, ${res.user?.full_name}!`, 'success');
      setActiveTab('dashboard');
    } else {
      showToast(res.message || 'Falha ao autenticar', 'error');
    }
    return res;
  };

  const changePassword = (newPassword: string) => {
    const res = store.changePassword(user.id, newPassword);
    if (res.success) {
      showToast('Senha alterada com sucesso!', 'success');
    } else {
      showToast(res.message || 'Erro ao alterar senha', 'error');
    }
    return res;
  };

  const signUp = (name: string, email: string, churchName?: string, ministryName?: string) => {
    store.signUp(name, email, churchName, ministryName);
    setIsAuthenticated(true);
    localStorage.removeItem('louvor_plus_logged_out');
    showToast('Conta MASTER_ADMIN criada com sucesso!', 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('louvor_plus_logged_out', 'true');
    showToast('Você saiu da sua conta.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        member,
        ministry,
        role,
        isMasterAdmin,
        isAdmin,
        isMinister,
        isMemberOnly,
        isAuthenticated,
        mustChangePassword,
        activeTab,
        setActiveTab,
        selectedScheduleId,
        setSelectedScheduleId,
        selectedSetlistId,
        setSelectedSetlistId,
        unreadCount,
        theme,
        toggleTheme,
        switchUser,
        login,
        changePassword,
        signUp,
        logout,
        showToast,
        openNewMemberModal,
        setOpenNewMemberModal,
        isUserMinistracaoForService,
        isUserMinistracaoForSchedule,
      }}
    >
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 pointer-events-none space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2 border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-600/60'
                : toast.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-600/60'
                : 'bg-slate-900/95 text-white border-slate-700/60'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
