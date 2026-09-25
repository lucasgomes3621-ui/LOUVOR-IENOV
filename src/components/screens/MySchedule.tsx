import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
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
  Share2,
  Users,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Sparkles,
  FileText
} from 'lucide-react';

export const MySchedule: React.FC = () => {
  const { member, setActiveTab, setSelectedSetlistId, showToast } = useApp();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // All upcoming schedules where the user is a member
  const mySchedules = store.schedules
    .filter((s) => s.service && s.service.date >= today && s.status !== 'completed')
    .filter((s) => s.members?.some((m) => m.ministry_member_id === member.id))
    .sort((a, b) => (a.service?.date || '').localeCompare(b.service?.date || ''));

  const primarySchedule = mySchedules[0];

  const handleConfirm = (scheduleId: string) => {
    store.updateScheduleConfirmation(scheduleId, member.id, 'confirmed');
    showToast('Presença confirmada com sucesso! Glória a Deus.', 'success');
  };

  const handleOpenDecline = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    setShowDeclineModal(true);
  };

  const handleConfirmDecline = () => {
    if (!selectedScheduleId) return;
    store.updateScheduleConfirmation(selectedScheduleId, member.id, 'declined', declineReason);
    setShowDeclineModal(false);
    setDeclineReason('');
    showToast('Recusa registrada. A liderança foi notificada.', 'info');
  };

  const shareScheduleWhatsApp = (sch: typeof primarySchedule) => {
    if (!sch || !sch.service) return;
    const s = sch.service;
    const myAssignment = sch.members?.find((m) => m.ministry_member_id === member.id);
    const setlist = store.getSetlistByServiceId(sch.service_id);

    let text = `🎵 *LOUVOR IENOV — Escala de Culto*\n🏛 *${store.ministry.church_name}*\n\n📅 *Culto:* ${s.title}\n🗓 *Data:* ${s.date} às ${s.start_time}\n📍 *Local:* ${s.location}\n🎸 *Minha Função:* ${myAssignment?.role?.name || 'Equipe'}\n`;

    if (setlist && setlist.songs && setlist.songs.length > 0) {
      text += `\n🎶 *Repertório:*\n`;
      setlist.songs.forEach((sg, idx) => {
        text += `${idx + 1}. ${sg.song?.title} (Tom: ${sg.key_override || sg.song?.original_key})\n`;
      });
    }

    text += `\nConfira todos os links e detalhes no app LOUVOR IENOV!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleExportPDF = async () => {
    if (!primarySchedule) return;
    setIsExportingPDF(true);
    try {
      const setlist = store.getSetlistByServiceId(primarySchedule.service_id);
      const doc = generateSingleSchedulePDF(primarySchedule, store.ministry, setlist);
      const sTitle = (primarySchedule.service?.title || 'culto').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const sDate = primarySchedule.service?.date || 'data';
      const fileName = `escala-${sTitle}-${sDate}.pdf`;
      const title = `Escala — ${primarySchedule.service?.title}`;
      const text = `📄 Segue a escala em PDF oficial de ${primarySchedule.service?.title} (${formatDateBR(primarySchedule.service?.date || '')}).`;

      const res = await downloadOrShareSchedulePDF(doc, fileName, title, text, true);
      if (res.downloaded) {
        showToast('PDF baixado com sucesso!', 'success');
      } else if (res.shared) {
        showToast('PDF compartilhado!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao exportar PDF.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (!primarySchedule) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center pb-24">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-4">
          Você não está escalado no momento
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 max-w-md mx-auto font-semibold">
          Assim que o líder de louvor publicar uma nova escala incluindo seu nome, ela aparecerá aqui para você confirmar sua presença.
        </p>
        <button
          onClick={() => setActiveTab('disponibilidade')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition"
        >
          <Calendar className="w-4 h-4" />
          <span>Informar Minha Disponibilidade</span>
        </button>
      </div>
    );
  }

  const userAssignment = primarySchedule.members?.find((m) => m.ministry_member_id === member.id);
  const isMinistracao =
    userAssignment?.role?.name?.toLowerCase().includes('ministra') ||
    userAssignment?.role_id === 'role-ministracao' ||
    primarySchedule.repertoire_responsible_id === member.id;
  const isRepertoireResponsible = isMinistracao || primarySchedule.repertoire_responsible_id === member.id;
  const setlist = store.getSetlistByServiceId(primarySchedule.service_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Minha Escala
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            Confirmação rápida, equipe escalada e repertório do culto.
          </p>
        </div>
        <button
          onClick={() => shareScheduleWhatsApp(primarySchedule)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>
      </div>

      {/* Primary Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/20 dark:border-indigo-500/30 p-5 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Banner indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
              Próxima Ministração
            </span>
            {primarySchedule.status === 'draft' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Rascunho
              </span>
            )}
          </div>

          {/* User Confirmation Status Badge */}
          {userAssignment?.confirmation_status === 'confirmed' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400/40">
              <CheckCircle className="w-4 h-4" />
              Presença Confirmada
            </span>
          ) : userAssignment?.confirmation_status === 'declined' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-400/40">
              <XCircle className="w-4 h-4" />
              Você Recusou
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400/40 animate-pulse">
              <AlertCircle className="w-4 h-4" />
              Aguardando Sua Resposta
            </span>
          )}
        </div>

        {/* Details */}
        <div className="mt-4 space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {primarySchedule.service?.title}
            </h2>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-4 h-4" />
                {primarySchedule.service?.date}
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock className="w-4 h-4 text-slate-400" />
                {primarySchedule.service?.start_time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {primarySchedule.service?.location}
              </span>
            </div>
          </div>

          {/* Function Highlight */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isMinistracao
              ? 'bg-amber-500/10 border-amber-400/60 dark:bg-amber-950/30 dark:border-amber-600/50'
              : 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold uppercase tracking-wider ${
                  isMinistracao ? 'text-amber-800 dark:text-amber-300' : 'text-indigo-600 dark:text-indigo-400'
                }`}>
                  Sua Função Escalada:
                </span>
                {isMinistracao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    Responsável pelo Louvor
                  </span>
                )}
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                <span>{isMinistracao ? '🎤 Ministração' : `🎸 ${userAssignment?.role?.name || 'Vocal'}`}</span>
              </p>
              {isMinistracao && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-semibold">
                  Você tem o poder de escolher e definir as músicas que serão cantadas no culto!
                </p>
              )}
            </div>

            {isRepertoireResponsible && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (setlist) setSelectedSetlistId(setlist.id);
                    setActiveTab('repertorios');
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition shadow-md flex items-center gap-2 ${
                    isMinistracao
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{setlist && setlist.songs && setlist.songs.length > 0 ? 'Ver / Editar Músicas' : 'Escolher Músicas do Culto'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 1-Tap Big Confirmation Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleConfirm(primarySchedule.id)}
              className={`flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-black text-sm tracking-wide transition shadow-lg active:scale-95 ${
                userAssignment?.confirmation_status === 'confirmed'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>CONFIRMAR PRESENÇA</span>
            </button>

            <button
              onClick={() => handleOpenDecline(primarySchedule.id)}
              className={`flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-bold text-sm transition border active:scale-95 ${
                userAssignment?.confirmation_status === 'declined'
                  ? 'bg-rose-600 text-white border-rose-600 ring-4 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 hover:border-rose-300'
              }`}
            >
              <XCircle className="w-5 h-5" />
              <span>NÃO POSSO PARTICIPAR</span>
            </button>
          </div>

          {/* Baixar PDF Oficial */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-800 dark:text-slate-200 font-bold text-xs transition shadow-xs active:scale-95"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <span>{isExportingPDF ? 'Gerando PDF Oficial...' : 'Baixar PDF Oficial Desta Escala'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team for this service */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Equipe Escalada ({primarySchedule.members?.length || 0} membros)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {primarySchedule.members?.map((sm) => {
            const isMe = sm.ministry_member_id === member.id;
            const isResp = primarySchedule.repertoire_responsible_id === sm.ministry_member_id;
            return (
              <div
                key={sm.id}
                className={`p-3 rounded-2xl flex items-center justify-between border ${
                  isMe
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={sm.member?.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {sm.member?.profile?.full_name} {isMe && '(Você)'}
                    </p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                      {sm.role?.name || 'Vocal'}
                      {isResp && ' • Resp. Repertório'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {sm.confirmation_status === 'confirmed' ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Confirmado
                    </span>
                  ) : sm.confirmation_status === 'declined' ? (
                    <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Recusou
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setlist for this service */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Repertório Deste Culto
            </h3>
          </div>
          {setlist && (
            <button
              onClick={() => {
                setSelectedSetlistId(setlist.id);
                setActiveTab('repertorios');
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Ver em Modo Palco</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {setlist && setlist.songs && setlist.songs.length > 0 ? (
          <div className="space-y-3">
            {setlist.songs.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {item.song?.title}
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-semibold">
                        {item.song?.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                      Tom: {item.key_override || item.song?.original_key}
                    </span>
                    {(item.bpm_override || item.song?.bpm) && (
                      <span className="px-2 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                        {item.bpm_override || item.song?.bpm} BPM
                      </span>
                    )}
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                    💡 <strong>Obs:</strong> {item.notes}
                  </p>
                )}

                {/* External links */}
                <div className="flex items-center gap-2 pt-1">
                  {item.song?.links?.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        link.platform === 'youtube'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{link.platform === 'youtube' ? 'YouTube' : 'Spotify'}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-slate-700 dark:text-slate-300 font-semibold">
            O responsável ainda não publicou as músicas para este culto.
          </div>
        )}
      </div>

      {/* Decline Modal with reason input */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-500" />
              <span>Não pode participar desta escala?</span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-semibold">
              Informe o motivo para que a liderança possa ajustar a equipe com antecedência.
            </p>

            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Ex: Estarei viajando a trabalho no fim de semana..."
              className="mt-4 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDecline}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
