import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { AvailabilityStatus } from '../../types/database';
import {
  Calendar,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Users,
  MessageSquare
} from 'lucide-react';

export const AvailabilityScreen: React.FC = () => {
  const { member, isAdmin, showToast } = useApp();

  // Generate next 4 weeks of Wednesdays and Sundays
  const generateUpcomingDates = () => {
    const dates: Array<{ dateStr: string; label: string; dayOfWeek: string }> = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay(); // 0 = Domingo, 3 = Quarta
      if (day === 0 || day === 3 || day === 6) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = day === 0 ? 'Domingo' : day === 3 ? 'Quarta' : 'Sábado';
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        dates.push({ dateStr, label, dayOfWeek });
      }
    }
    return dates;
  };

  const dates = generateUpcomingDates();
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.dateStr || '');
  const [noteInput, setNoteInput] = useState('');

  const currentAvail = store.getMemberAvailability(member.id, selectedDate);

  const handleSetStatus = (status: AvailabilityStatus) => {
    store.setAvailability(selectedDate, status, noteInput);
    showToast('Disponibilidade salva com sucesso!', 'success');
  };

  // For Admin: get all members' status on the selected date
  const teamAvailabilityOnSelectedDate = store.members.map((m) => {
    const av = store.getMemberAvailability(m.id, selectedDate);
    return {
      member: m,
      status: av?.status || 'unset',
      note: av?.note,
    };
  });

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Minha Disponibilidade
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
          Informe seus dias livres para que a liderança possa escalar você com precisão.
        </p>
      </div>

      {/* Date selector chips */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Selecione a Data do Culto:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const av = store.getMemberAvailability(member.id, d.dateStr);

            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  setSelectedDate(d.dateStr);
                  setNoteInput(av?.note || '');
                }}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center min-w-[90px] border transition active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-80">{d.dayOfWeek}</span>
                <span className="text-base font-black my-0.5">{d.label}</span>
                {av?.status === 'available' ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : av?.status === 'unavailable' ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                ) : av?.status === 'maybe' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status selection for current user */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Sua resposta para {selectedDate}
            </h2>
          </div>
          {currentAvail?.status ? (
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Registrado
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Não respondido
            </span>
          )}
        </div>

        {/* 3 Status Buttons (Section 10: available, unavailable, maybe) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleSetStatus('available')}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2.5 transition active:scale-95 ${
              currentAvail?.status === 'available'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>🟢 Disponível</span>
          </button>

          <button
            onClick={() => handleSetStatus('maybe')}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2.5 transition active:scale-95 ${
              currentAvail?.status === 'maybe'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <HelpCircle className="w-5 h-5" />
            <span>🟡 Talvez</span>
          </button>

          <button
            onClick={() => handleSetStatus('unavailable')}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2.5 transition active:scale-95 ${
              currentAvail?.status === 'unavailable'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-5 h-5" />
            <span>🔴 Indisponível</span>
          </button>
        </div>

        {/* Note input */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Observação opcional para os líderes:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Ex: Posso chegar às 18h / saio mais cedo às 21h..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={() => {
                if (currentAvail) {
                  handleSetStatus(currentAvail.status);
                } else {
                  handleSetStatus('available');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shrink-0"
            >
              Salvar Nota
            </button>
          </div>
        </div>
      </div>

      {/* Admin Team Availability Overview (Section 35) */}
      {isAdmin && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Disponibilidade da Equipe em {selectedDate}
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Visão do Líder
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teamAvailabilityOnSelectedDate.map(({ member: m, status, note }) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={m.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {m.profile?.full_name}
                    </p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold truncate">
                      {m.roles?.map((r) => r.name).join(', ') || 'Vocal'}
                    </p>
                    {note && (
                      <p className="text-[10px] text-amber-600 italic truncate mt-0.5">
                        "{note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {status === 'available' ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[11px]">
                      🟢 Livre
                    </span>
                  ) : status === 'unavailable' ? (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-extrabold text-[11px]">
                      🔴 Não pode
                    </span>
                  ) : status === 'maybe' ? (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[11px]">
                      🟡 Talvez
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
                      ⚪ Não avisou
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
