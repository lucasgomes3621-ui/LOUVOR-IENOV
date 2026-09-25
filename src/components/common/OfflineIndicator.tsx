import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 text-slate-950 font-semibold px-4 py-1.5 text-xs shadow-lg backdrop-blur-sm border border-amber-400">
      <WifiOff className="w-3.5 h-3.5 animate-pulse" />
      <span>Modo Offline — exibindo dados salvos no dispositivo</span>
    </div>
  );
};
