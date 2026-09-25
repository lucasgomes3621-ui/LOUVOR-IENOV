import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { BrandLogo } from '../common/BrandLogo';
import { Sun, Moon, Bell, ChevronDown, UserCheck, Shield, Music2, LogOut, RotateCcw } from 'lucide-react';

export const Header: React.FC = () => {
  const { ministry, user, member, isMasterAdmin, role, unreadCount, theme, toggleTheme, switchUser, setActiveTab, logout } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadge = (r: string) => {
    if (r === 'MASTER_ADMIN' || r === 'admin') {
      return { label: '👑 MASTER ADMIN', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
    }
    if (r === 'MINISTER' || r === 'minister') {
      return { label: 'Ministrante', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
    }
    return { label: '🔘 Membro', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
  };

  const badge = getRoleBadge(role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-md shadow-indigo-500/10 shrink-0 overflow-hidden">
            <BrandLogo imgClassName="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                LOUVOR IENOV
              </span>
              <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md border ${badge.color} hidden sm:inline-block`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-semibold">
              {ministry.name || 'Ministério de Louvor IENOV'}
            </p>
          </div>
        </div>

        {/* Right: Actions & User Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* Notifications button */}
          <button
            onClick={() => setActiveTab('notificacoes')}
            className="relative p-2 rounded-xl text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <div className="text-left hidden md:block">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {user.full_name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">{badge.label}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            </button>

            {/* Dropdown Menu for Testing Personas & Profile */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-40 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user.full_name}</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                      @{user.username || 'usuario'}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      {member.roles && member.roles.length > 0 && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                          • {member.roles.map((r) => r.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Switch User for Easy Testing */}
                  <div className="pt-2">
                    <div className="px-3 py-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Alternar Usuário de Teste:
                      </span>
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                      {store.members.map((m) => {
                        const isCurrent = m.user_id === user.id;
                        const roleLabel =
                          m.role === 'MASTER_ADMIN' || m.role === 'admin'
                            ? '👑 Master Admin'
                            : 'Membro';
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              switchUser(m.user_id);
                              setShowUserMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition ${
                              isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={
                                  m.profile?.avatar_url ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                                }
                                alt=""
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                              <div className="truncate">
                                <p className="font-semibold truncate">{m.profile?.full_name}</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold font-mono truncate">
                                  @{m.profile?.username} • {roleLabel}
                                </p>
                              </div>
                            </div>
                            {isCurrent && <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('configuracoes');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Configurações do Ministério
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-lg flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
