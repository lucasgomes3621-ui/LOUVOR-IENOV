import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { BrandLogo } from '../common/BrandLogo';
import {
  Sliders,
  Building,
  RotateCcw,
  Activity,
  Sun,
  Moon
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { ministry, isAdmin, theme, toggleTheme, showToast } = useApp();

  const [churchName, setChurchName] = useState(ministry.church_name);
  const [ministryName, setMinistryName] = useState(ministry.name);
  const [description, setDescription] = useState(ministry.description || '');

  const handleSaveMinistry = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateMinistry({
      church_name: churchName,
      name: ministryName,
      description,
    });
    showToast('Informações do ministério atualizadas com sucesso!', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Configurações
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
          Preferências do aplicativo, dados da igreja e histórico de atividades.
        </p>
      </div>

      {/* 1. Theme & Appearance */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <span>Aparência e Aplicativo</span>
        </h2>

        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">Modo Escuro (Dark Mode)</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Ideal para uso no palco ou iluminação baixa da igreja.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{theme === 'dark' ? 'Ativado' : 'Desativado'}</span>
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">Instalar como PWA</p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Adicione à tela inicial do celular com suporte a navegação rápida.
            </p>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      {/* 2. Ministry Configuration (Admin only) */}
      {isAdmin && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>Dados da Igreja e do Ministério</span>
          </h2>

          <form onSubmit={handleSaveMinistry} className="space-y-3.5">
            {/* Logo Preview */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
                <BrandLogo imgClassName="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Logo do Ministério (IENOV)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  /ienov-logo.png
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome da Igreja
              </label>
              <input
                type="text"
                required
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Ministério de Louvor
              </label>
              <input
                type="text"
                required
                value={ministryName}
                onChange={(e) => setMinistryName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descrição / Visão do Ministério
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
              >
                Salvar Informações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity Logs */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <span>Histórico de Atividades do Ministério</span>
        </h2>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {store.logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {log.action}
                </p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold truncate">
                  Por {log.user_name || 'Usuário'}
                </p>
              </div>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                {new Date(log.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Demo Data Management */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Restaurar Dados Padrão de Demonstração
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
            Recarrega membros, cultos, escalas e músicas de teste iniciais.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm('Deseja recarregar os dados padrão do ministério?')) {
              store.resetDemoData();
              window.location.reload();
            }
          }}
          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar</span>
        </button>
      </div>
    </div>
  );
};
