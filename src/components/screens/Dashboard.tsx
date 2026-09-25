import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { BrandLogo } from '../common/BrandLogo';
import { SchedulePDFExportModal } from '../schedules/SchedulePDFExportModal';
import {
  generateSingleSchedulePDF,
  downloadOrShareSchedulePDF,
  formatDateBR
} from '../../utils/pdfExport';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Music,
  ExternalLink,
  Plus,
  Share2,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  UserCheck,
  UserPlus,
  Users,
  ShieldCheck,
  Activity,
  Layers,
  HelpCircle,
  FileText,
  TrendingUp,
  Award,
  BarChart3,
  Flame,
  ArrowRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    user,
    member,
    isMasterAdmin,
    isMemberOnly,
    setActiveTab,
    setSelectedScheduleId,
    setSelectedSetlistId,
    showToast,
    setOpenNewMemberModal,
  } = useApp();

  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Schedules
  const upcomingSchedules = store.schedules
    .filter((s) => s.service && s.service.date >= today && s.status !== 'completed')
    .sort((a, b) => (a.service?.date || '').localeCompare(b.service?.date || ''));

  // User's own next schedule
  const userNextSchedule = upcomingSchedules.find((s) =>
    s.members?.some((m) => m.ministry_member_id === member.id)
  );

  const userAssignment = userNextSchedule?.members?.find(
    (m) => m.ministry_member_id === member.id
  );

  const isUserMinistracaoInNextSchedule =
    userAssignment?.role?.name?.toLowerCase().includes('ministra') ||
    userAssignment?.role_id === 'role-ministracao' ||
    userNextSchedule?.repertoire_responsible_id === member.id;

  const nextSetlist = userNextSchedule?.service_id
    ? store.getSetlistByServiceId(userNextSchedule.service_id)
    : undefined;

  // Master Admin metrics
  const activeMembersCount = store.members.filter((m) => m.active).length;
  const upcomingSchedulesCount = upcomingSchedules.length;
  const pendingConfirmationsCount = upcomingSchedules.reduce((acc, sch) => {
    return acc + (sch.members?.filter((m) => m.confirmation_status === 'pending').length || 0);
  }, 0);
  const publishedSetlistsCount = store.setlists.filter((sl) => sl.status === 'published').length;
  const upcomingServicesCount = store.services.filter((s) => s.date >= today).length;

  // Unavailable members count for upcoming dates
  const nextServiceDate = upcomingSchedules[0]?.service?.date || today;
  const unavailableMembersOnNextService = store.members.filter((m) => {
    const av = store.getMemberAvailability(m.id, nextServiceDate);
    return av?.status === 'unavailable';
  });

  // =========================================================================
  // Resumo Estatístico: Cálculos de Músicas Mais Tocadas no Mês
  // =========================================================================
  const currentMonthPrefix = today.slice(0, 7); // e.g. "2026-09"
  const currentMonthDate = new Date();
  const currentMonthName = currentMonthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const formattedMonthName = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const currentMonthShortName = currentMonthDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');

  // Contagem de execuções de cada música em repertórios do mês
  const songPlayCounts = new Map<string, number>();

  store.setlists.forEach((setlist) => {
    const service = store.services.find((s) => s.id === setlist.service_id);
    const serviceDate = service?.date || setlist.created_at;
    const isThisMonth = serviceDate && serviceDate.startsWith(currentMonthPrefix);

    if (isThisMonth) {
      setlist.songs?.forEach((item) => {
        const count = songPlayCounts.get(item.song_id) || 0;
        songPlayCounts.set(item.song_id, count + 1);
      });
    }
  });

  // Se não houver músicas específicas neste mês, computa entre todos os repertórios ativos
  if (songPlayCounts.size === 0) {
    store.setlists.forEach((setlist) => {
      setlist.songs?.forEach((item) => {
        const count = songPlayCounts.get(item.song_id) || 0;
        songPlayCounts.set(item.song_id, count + 1);
      });
    });
  }

  // Inclui histórico de músicas com last_used_date no mês
  store.songs.forEach((s) => {
    if (s.last_used_date && s.last_used_date.startsWith(currentMonthPrefix) && !songPlayCounts.has(s.id)) {
      songPlayCounts.set(s.id, 1);
    }
  });

  // Lista ordenada das músicas mais tocadas
  const topSongs = Array.from(songPlayCounts.entries())
    .map(([songId, count]) => {
      const song = store.songs.find((s) => s.id === songId);
      return { song, count };
    })
    .filter((item): item is { song: (typeof store.songs)[0]; count: number } => Boolean(item.song))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Garante que o ranking mostre no mínimo as principais músicas do repertório
  if (topSongs.length < 4) {
    store.songs.slice(0, 4).forEach((s, idx) => {
      if (!topSongs.some((t) => t.song.id === s.id)) {
        topSongs.push({ song: s, count: Math.max(1, 3 - idx) });
      }
    });
  }

  const getWeekdayName = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
  };

  const handleConfirm = (status: 'confirmed' | 'declined', note?: string) => {
    if (!userNextSchedule) return;
    store.updateScheduleConfirmation(userNextSchedule.id, member.id, status, note);
    showToast(
      status === 'confirmed'
        ? 'Escala confirmada com sucesso! Deus abençoe sua ministração.'
        : 'Sua indisponibilidade foi registrada para esta escala.',
      status === 'confirmed' ? 'success' : 'info'
    );
    setDeclineModalOpen(false);
  };

  const shareScheduleWhatsApp = () => {
    if (!userNextSchedule || !userNextSchedule.service) return;
    const s = userNextSchedule.service;
    const text = `🎵 *LOUVOR IENOV — Escala Confirmada*\n🏛 *${store.ministry.church_name}*\n📅 *Culto:* ${s.title}\n🗓 *Data:* ${s.date} às ${s.start_time}\n📍 *Local:* ${s.location}\n🎸 *Minha Função:* ${userAssignment?.role?.name || 'Equipe'}\n\nAcesse no LOUVOR IENOV para conferir o repertório e cifras!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-6xl mx-auto">
      {/* 1. Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-900/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 shrink-0 hidden sm:flex items-center justify-center shadow-lg overflow-hidden">
              <BrandLogo imgClassName="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{store.ministry.name}</span>
                {isMasterAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                    MASTER_ADMIN
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                Olá, {user.full_name.split(' ')[0]}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-md font-medium">
                {isMasterAdmin
                  ? 'Painel Geral do Líder: gerencie membros, escalas, repertórios e cultos.'
                  : userNextSchedule
                  ? `Sua próxima ministração está agendada para ${userNextSchedule.service?.date}.`
                  : 'Você não possui escalas pendentes no momento.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isMasterAdmin ? (
              <>
                <button
                  onClick={() => setOpenNewMemberModal(true)}
                  className="inline-flex items-center gap-1.5 bg-white text-indigo-950 font-black px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md hover:bg-indigo-50 transition active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>+ Novo Membro</span>
                </button>
                <button
                  onClick={() => setActiveTab('escalas')}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md transition active:scale-95 border border-indigo-400/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Escala</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('minha-escala')}
                className="inline-flex items-center gap-2 bg-white text-indigo-950 font-black px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md hover:bg-indigo-50 transition active:scale-95"
              >
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>Minha Escala</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESUMO ESTATÍSTICO DO MINISTÉRIO (Membros, Escalas, Músicas Mais Tocadas) */}
      {/* ========================================================================= */}
      <div className="space-y-4 animate-in fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Resumo Estatístico do Ministério</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              Membros ativos, próximas escalas agendadas e músicas mais tocadas em {formattedMonthName}.
            </p>
          </div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1 rounded-full self-start sm:self-auto">
            Atualizado em tempo real
          </span>
        </div>

        {/* 3 Top Highlight Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Membros Ativos */}
          <div
            onClick={() => setActiveTab('equipe')}
            className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/80 dark:hover:border-indigo-500/80 transition cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Membros Ativos
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {activeMembersCount}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Ativos na equipe
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1">
              Integrantes disponíveis para escalas e revezamento no louvor.
            </p>
          </div>

          {/* 2. Próximas Escalas Agendadas */}
          <div
            onClick={() => setActiveTab('escalas')}
            className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/80 dark:hover:border-indigo-500/80 transition cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Próximas Escalas
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {upcomingSchedulesCount}
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {upcomingServicesCount} cultos agendados
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1">
              Escalas montadas para as próximas celebrações do ministério.
            </p>
          </div>

          {/* 3. Músicas Mais Tocadas no Mês */}
          <div
            onClick={() => setActiveTab('louvores')}
            className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/80 dark:hover:border-indigo-500/80 transition cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mais Tocadas ({currentMonthShortName})
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {topSongs.length}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> #{1}: {topSongs[0]?.song.title.split(' ')[0] || 'Louvor'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1 truncate">
              {topSongs[0] ? `"${topSongs[0].song.title}" (${topSongs[0].song.artist}) lidera o repertório.` : 'Repertório ativo do mês.'}
            </p>
          </div>
        </div>

        {/* Two-Column Detail Grid: Próximas Escalas & Músicas Mais Tocadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card: Próximas Escalas Agendadas */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Próximas Escalas Agendadas
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('escalas')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Todas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingSchedules.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingSchedules.slice(0, 4).map((sch) => {
                  const s = sch.service;
                  const ministracao =
                    sch.repertoire_responsible?.profile?.full_name ||
                    store.getMinistracaoMember(sch.service_id)?.profile?.full_name ||
                    'A definir';
                  const confirmedCount = sch.members?.filter((m) => m.confirmation_status === 'confirmed').length || 0;
                  const totalMembers = sch.members?.length || 0;

                  return (
                    <div
                      key={sch.id}
                      onClick={() => {
                        setSelectedScheduleId(sch.id);
                        setActiveTab('escalas');
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 cursor-pointer transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Date badge */}
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 leading-none">
                            {getWeekdayName(s?.date || '')}
                          </span>
                          <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {s?.date ? s.date.split('-')[2] : '--'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {s?.title || 'Culto'}
                            </p>
                            {sch.status === 'published' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                                Publicada
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                                Rascunho
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                            <span>⏰ {s?.start_time || '18:00'}</span>
                            <span>•</span>
                            <span className="truncate">🎤 {ministracao}</span>
                            <span>•</span>
                            <span>👥 {confirmedCount}/{totalMembers} conf.</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhuma escala futura agendada.
              </div>
            )}
          </div>

          {/* Card: Músicas Mais Tocadas no Mês */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Músicas Mais Tocadas ({formattedMonthName})
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('louvores')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Cifras</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {topSongs.map((item, idx) => {
                const rankBadges = ['🥇', '🥈', '🥉', '4º', '5º'];
                const rankColor =
                  idx === 0
                    ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/60'
                    : idx === 1
                    ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300'
                    : idx === 2
                    ? 'bg-orange-100/80 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300/60'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                return (
                  <div
                    key={item.song.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Medal */}
                      <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${rankColor}`}>
                        {rankBadges[idx] || `${idx + 1}º`}
                      </span>

                      <div className="min-w-0">
                        <p className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {item.song.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold truncate">
                          {item.song.artist} • Tom: <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.song.original_key}</span>
                          {item.song.bpm ? ` • ${item.song.bpm} BPM` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {item.count}x no mês
                      </span>
                      {item.song.links?.find((l) => l.platform === 'youtube') && (
                        <a
                          href={item.song.links.find((l) => l.platform === 'youtube')?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 transition"
                          title="Ouvir no YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DASHBOARD DO MASTER (SECTION 7 OF SPEC)                                */}
      {/* ========================================================================= */}
      {isMasterAdmin && (
        <div className="space-y-6 animate-in fade-in">
          {/* Visão Geral (6 métricas-chave descritas em #7) */}
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Visão Geral do Ministério</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Membros Ativos */}
              <div
                onClick={() => setActiveTab('equipe')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Membros Ativos
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 transition">
                  {activeMembersCount}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3 h-3" />
                  Ativos
                </span>
              </div>

              {/* Próximas Escalas */}
              <div
                onClick={() => setActiveTab('escalas')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Próximas Escalas
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 transition">
                  {upcomingSchedulesCount}
                </p>
                <span className="text-[10px] text-indigo-500 font-bold mt-1 block">
                  Agendadas
                </span>
              </div>

              {/* Confirmações Pendentes */}
              <div
                onClick={() => setActiveTab('escalas')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Confirmações Pendentes
                </span>
                <p className="text-2xl font-black text-amber-500 mt-1">
                  {pendingConfirmationsCount}
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 block">
                  Aguardando resposta
                </span>
              </div>

              {/* Próximos Cultos */}
              <div
                onClick={() => setActiveTab('escalas')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Próximos Cultos
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 transition">
                  {upcomingServicesCount}
                </p>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1 block">
                  No calendário
                </span>
              </div>

              {/* Repertórios Publicados */}
              <div
                onClick={() => setActiveTab('repertorios')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-indigo-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Repertórios Publicados
                </span>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {publishedSetlistsCount}
                </p>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-1 block">
                  Prontos p/ culto
                </span>
              </div>

              {/* Membros Indisponíveis */}
              <div
                onClick={() => setActiveTab('disponibilidade')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-500 transition group"
              >
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Indisponíveis Próx. Culto
                </span>
                <p className="text-2xl font-black text-rose-500 mt-1">
                  {unavailableMembersOnNextService.length}
                </p>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 block">
                  {unavailableMembersOnNextService.length > 0 ? 'Não escalar' : 'Sem ausências'}
                </span>
              </div>
            </div>
          </div>

          {/* Ações Rápidas do Master (Section 7) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Ações Rápidas do Master Admin</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* + Novo membro */}
              <button
                type="button"
                onClick={() => setOpenNewMemberModal(true)}
                className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-left transition active:scale-95 group"
              >
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">+ Novo Membro</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Cadastrar e gerar login</p>
              </button>

              {/* + Nova escala */}
              <button
                type="button"
                onClick={() => setActiveTab('escalas')}
                className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-left transition active:scale-95 group"
              >
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">+ Nova Escala</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Montar equipe do culto</p>
              </button>

              {/* Gerar PDF Oficial */}
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/80 text-left transition active:scale-95 group"
              >
                <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Gerar PDF</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Dia, Semana ou Mês</p>
              </button>

              {/* + Novo culto */}
              <button
                type="button"
                onClick={() => setActiveTab('escalas')}
                className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-left transition active:scale-95 group"
              >
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">+ Novo Culto</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Adicionar celebração</p>
              </button>

              {/* + Novo louvor */}
              <button
                type="button"
                onClick={() => setActiveTab('louvores')}
                className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-left transition active:scale-95 group"
              >
                <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">+ Novo Louvor</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Biblioteca e YouTube</p>
              </button>

              {/* Gerenciar equipe */}
              <button
                type="button"
                onClick={() => setActiveTab('equipe')}
                className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition active:scale-95 group"
              >
                <Users className="w-5 h-5 text-slate-700 dark:text-slate-300 mb-2 group-hover:scale-110 transition" />
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Gerenciar Equipe</p>
                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">Senhas e desativações</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MINHA PRÓXIMA ESCALA (FOR ALL USERS, ESPECIALLY MEMBERS #8)             */}
      {/* ========================================================================= */}
      {userNextSchedule && userAssignment ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-indigo-600 animate-ping" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Minha Próxima Escala
              </h2>
            </div>

            {/* Status Pill */}
            {userAssignment.confirmation_status === 'confirmed' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                <CheckCircle className="w-3.5 h-3.5" />
                Confirmado
              </span>
            ) : userAssignment.confirmation_status === 'declined' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40">
                <XCircle className="w-3.5 h-3.5" />
                Recusado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                <AlertCircle className="w-3.5 h-3.5" />
                🟡 Confirmação Pendente
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {userNextSchedule.service?.title}
              </h3>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  {userNextSchedule.service?.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {userNextSchedule.service?.start_time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  {userNextSchedule.service?.location}
                </span>
              </div>
            </div>

            {/* Minha Função */}
            <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isUserMinistracaoInNextSchedule
                ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-400/60 dark:border-amber-600/40'
                : 'bg-indigo-50/70 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700/60'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isUserMinistracaoInNextSchedule ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    Minha Função na Escala:
                  </span>
                  {isUserMinistracaoInNextSchedule && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      Responsável pelo Louvor
                    </span>
                  )}
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {isUserMinistracaoInNextSchedule ? '🎤 Ministração' : `🎸 ${userAssignment.role?.name || 'Ministério de Louvor'}`}
                </p>
                {isUserMinistracaoInNextSchedule && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-semibold">
                    Você é a Ministração: escolha as músicas que serão cantadas no culto!
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isUserMinistracaoInNextSchedule && (
                  <button
                    onClick={() => {
                      if (nextSetlist) setSelectedSetlistId(nextSetlist.id);
                      setActiveTab('repertorios');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Escolher Músicas</span>
                  </button>
                )}
                <button
                  onClick={shareScheduleWhatsApp}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition shadow-xs flex items-center gap-1.5 text-xs font-bold"
                  title="Compartilhar escala no WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Confirmation Buttons (Section 8: CONFIRMAR / NÃO POSSO PARTICIPAR) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleConfirm('confirmed')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md active:scale-95 ${
                  userAssignment.confirmation_status === 'confirmed'
                    ? 'bg-emerald-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-500'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>CONFIRMAR</span>
              </button>

              <button
                type="button"
                onClick={() => setDeclineModalOpen(true)}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 ${
                  userAssignment.confirmation_status === 'declined'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-500'
                    : 'bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-rose-600'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>NÃO POSSO PARTICIPAR</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center shadow-xs">
          <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
            Nenhuma escala agendada para você no momento
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
            Fique atento às notificações ou informe suas datas livres na aba de disponibilidade.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRÓXIMO REPERTÓRIO (SECTION 8)                                         */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Próximo Repertório
            </h2>
          </div>
          {nextSetlist && (
            <button
              onClick={() => {
                setSelectedSetlistId(nextSetlist.id);
                setActiveTab('repertorios');
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Completo / Modo Palco</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {nextSetlist && nextSetlist.songs && nextSetlist.songs.length > 0 ? (
          <div className="space-y-2.5">
            {nextSetlist.songs.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.song?.title}
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold truncate">
                      {item.song?.artist} • Tom: <strong className="text-indigo-600 dark:text-indigo-400">{item.key_override || item.song?.original_key}</strong>
                      {item.bpm_override || item.song?.bpm ? ` • ${item.bpm_override || item.song?.bpm} BPM` : ''}
                    </p>
                  </div>
                </div>

                {item.song?.links && item.song.links.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.song.links.find((l) => l.platform === 'youtube') && (
                      <a
                        href={item.song.links.find((l) => l.platform === 'youtube')?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 transition"
                        title="Ouvir no YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
              Repertório em elaboração pela liderança para o próximo culto.
            </p>
          </div>
        )}
      </div>

      {/* 5. Quick CTA: Minha Disponibilidade */}
      <div
        onClick={() => setActiveTab('disponibilidade')}
        className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-slate-900 border border-amber-200/70 dark:border-amber-900/40 cursor-pointer hover:shadow-md transition active:scale-98 flex items-center justify-between"
      >
        <div>
          <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
            🗓️ Minha Disponibilidade
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
            Marque seus cultos disponíveis (Quartas e Domingos)
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
            Ajude o líder a montar as escalas sem conflitos de horário.
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-amber-500 shrink-0" />
      </div>

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Recusar Escala
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Informe aos líderes o motivo pelo qual você não poderá ministrar neste culto (opcional):
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Ex: Plantão no trabalho, viagem da família..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white font-semibold"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => handleConfirm('declined', declineReason)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal (Dia, Semana, Mês) */}
      <SchedulePDFExportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
      />
    </div>
  );
};
