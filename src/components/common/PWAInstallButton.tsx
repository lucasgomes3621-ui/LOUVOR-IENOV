import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, don't show
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Desktop PWA install
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-xl font-semibold transition shadow-sm active:scale-95 ${
          compact
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 text-xs'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2 text-sm shadow-indigo-500/20'
        }`}
        title="Instalar LOUVOR IENOV no seu dispositivo"
      >
        <Download className="w-4 h-4" />
        <span>{compact ? 'Instalar App' : 'Instalar Aplicativo'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl font-medium border border-indigo-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 transition active:scale-95 ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    L+
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Instalar no iOS (iPhone)
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    1
                  </span>
                  <p>
                    No Safari, toque no ícone de <strong>Compartilhar</strong>{' '}
                    <Share2 className="inline w-4 h-4 mx-0.5 text-indigo-500" /> na barra inferior.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    2
                  </span>
                  <p>
                    Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    3
                  </span>
                  <p>
                    Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
