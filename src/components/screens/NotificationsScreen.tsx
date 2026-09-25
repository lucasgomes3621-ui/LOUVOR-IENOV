import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Notification } from '../../types/database';
import {
  Bell,
  CheckCircle,
  Calendar,
  Music,
  CheckCheck,
  XCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const { user, setActiveTab, setSelectedScheduleId, setSelectedSetlistId, showToast } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notifications = store.notifications
    .filter((n) => n.user_id === user.id)
    .filter((n) => (filter === 'unread' ? !n.read_at : true));

  const handleMarkAllAsRead = () => {
    store.markAllNotificationsAsRead();
    showToast('Todas as notificações marcadas como lidas!', 'success');
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read_at) {
      store.markNotificationAsRead(notif.id);
    }
    if (notif.related_setlist_id) {
      setSelectedSetlistId(notif.related_setlist_id);
      setActiveTab('repertorios');
    } else if (notif.related_service_id) {
      const sch = store.schedules.find((s) => s.service_id === notif.related_service_id);
      if (sch) setSelectedScheduleId(sch.id);
      setActiveTab('escalas');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'repertoire_published':
        return <Music className="w-5 h-5 text-indigo-500" />;
      case 'confirmation':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'declined':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Calendar className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Central de Avisos
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            Notificações de escalas, confirmações e repertórios publicados.
          </p>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-indigo-600" />
          <span>Marcar todas como lidas</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Não lidas
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-3">
              Nenhuma notificação por aqui
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
              Você será notificado quando novas escalas ou repertórios forem divulgados.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read_at;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                  isUnread
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </h4>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-semibold">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
