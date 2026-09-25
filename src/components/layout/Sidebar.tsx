import React from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Home,
  Calendar,
  Music,
  Bell,
  Users,
  CheckCircle2,
  Sliders,
  Disc3,
  CalendarCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, unreadCount, isAdmin, isMinister } = useApp();

  const navigation = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'minha-escala', label: 'Minha Escala', icon: CalendarCheck, highlight: true },
    { id: 'escalas', label: 'Todas as Escalas', icon: Calendar },
    { id: 'repertorios', label: 'Repertórios', icon: Music },
    { id: 'louvores', label: 'Biblioteca de Louvores', icon: Disc3 },
    { id: 'disponibilidade', label: 'Disponibilidade', icon: CheckCircle2 },
    { id: 'equipe', label: 'Equipe & Funções', icon: Users },
    { id: 'notificacoes', label: 'Notificações', icon: Bell, badge: unreadCount },
    { id: 'configuracoes', label: 'Configurações', icon: Sliders },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none">
      <div className="flex-1 py-4 px-3 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Quick stats footer in sidebar */}
      <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ministério Conectado</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
          {isAdmin ? 'Acesso de Líder com permissões totais.' : isMinister ? 'Acesso de Ministrante com permissão de repertório.' : 'Acesso de Membro com confirmação de escalas.'}
        </p>
      </div>
    </aside>
  );
};
