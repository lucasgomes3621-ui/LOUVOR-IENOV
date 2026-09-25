import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Home, Calendar, Music, Bell, Menu, X, Users, CheckCircle2, Sliders, Disc3 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, unreadCount } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'escalas', label: 'Escalas', icon: Calendar },
    { id: 'repertorios', label: 'Repertórios', icon: Music },
    { id: 'notificacoes', label: 'Avisos', icon: Bell, badge: unreadCount },
  ];

  const moreItems = [
    { id: 'louvores', label: 'Louvores & Cifras', icon: Disc3, desc: 'Biblioteca de músicas, tons e links' },
    { id: 'equipe', label: 'Equipe & Funções', icon: Users, desc: 'Membros, instrumentos e convites' },
    { id: 'disponibilidade', label: 'Minha Disponibilidade', icon: CheckCircle2, desc: 'Informe quando pode servir' },
    { id: 'configuracoes', label: 'Configurações', icon: Sliders, desc: 'Dados da igreja, Supabase e opções' },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* "Mais" Modal Sheet for Mobile */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200 dark:border-slate-800 shadow-2xl safe-bottom animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Mais Opções
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition active:scale-98 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-snug">{item.label}</p>
                      <p
                        className={`text-xs truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-700 dark:text-slate-300 font-semibold'
                        }`}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-bottom shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 transition active:scale-90 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              </button>
            );
          })}

          {/* "Mais" button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-90 ${
              ['louvores', 'equipe', 'disponibilidade', 'configuracoes'].includes(activeTab)
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] mt-1 tracking-tight">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
};
