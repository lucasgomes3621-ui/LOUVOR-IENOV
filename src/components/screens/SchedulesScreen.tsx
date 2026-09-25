import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Schedule } from '../../types/database';
import { SchedulePDFExportModal } from '../schedules/SchedulePDFExportModal';
import { EditScheduleModal } from '../schedules/EditScheduleModal';
import {
  generateSingleSchedulePDF,
  downloadOrShareSchedulePDF,
  formatDateBR
} from '../../utils/pdfExport';
import {
  FIXED_SERVICE_PRESETS,
  getNextDateForDayOfWeek,
  isRehearsalSuggestedForService,
  detectPresetByTitleOrType,
  getPresetById,
  ServicePreset
} from '../../utils/churchScheduleRules';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Music,
  Share2,
  ChevronRight,
  Sparkles,
  Send,
  X,
  FileText,
  Download,
  Edit3,
  MessageSquare
} from 'lucide-react';

export const SchedulesScreen: React.FC = () => {
  const { isAdmin, member, selectedScheduleId, setSelectedScheduleId, setSelectedSetlistId, setActiveTab, showToast } = useApp();
  const [filterView, setFilterView] = useState<'all' | 'published' | 'draft'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // PDF Export States
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfInitialSchedule, setPdfInitialSchedule] = useState<Schedule | null>(null);
  const [justCreatedSchedule, setJustCreatedSchedule] = useState<Schedule | null>(null);
  const [isExportingPDFId, setIsExportingPDFId] = useState<string | null>(null);

  // Edit Schedule Modal State
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Wizard state for creating schedule (Mobile-first steps)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('domingo-noite');
  const [newTitle, setNewTitle] = useState('Culto da Noite');
  const [newDate, setNewDate] = useState(() => getNextDateForDayOfWeek(0));
  const [newStartTime, setNewStartTime] = useState('18:00');
  const [newLocation, setNewLocation] = useState('Templo Principal');
  const [newNotes, setNewNotes] = useState('O ensaio será na quinta-feira às 19:30');
  const [newHasRehearsal, setNewHasRehearsal] = useState<boolean>(true);
  const [selectedMembers, setSelectedMembers] = useState<Array<{ member_id: string; role_id: string }>>([]);
  const [repertoireResponsibleId, setRepertoireResponsibleId] = useState<string>('');

  const quickObservationSuggestions = [
    'O ensaio será na quinta-feira às 19:30',
    'ENSAIO QUINTA FEIRA',
    'Ensaio domingo às 08:00 (Santa Ceia / EBD)',
    'Ensaio sábado às 18:00',
    'Chegar com 20 minutos de antecedência para oração',
    'Passagem de som 30 minutos antes do culto',
  ];

  const handleApplyPreset = (preset: ServicePreset) => {
    setSelectedPresetId(preset.id);
    setNewTitle(preset.title);
    setNewStartTime(preset.defaultStartTime);
    setNewLocation(preset.defaultLocation);
    setNewDate(getNextDateForDayOfWeek(preset.dayOfWeek));
    setNewHasRehearsal(preset.suggestsRehearsal);
    setNewNotes(preset.defaultRehearsalNote || '');
  };

  // Leader or Ministrante of the schedule can edit and decide on rehearsals
  const canEditSchedule = (sch: Schedule) => {
    if (isAdmin) return true;
    if (sch.repertoire_responsible_id === member.id || sch.repertoire_responsible?.id === member.id) return true;
    return sch.members?.some(
      (sm) => sm.ministry_member_id === member.id &&
        (sm.role?.name?.toLowerCase().includes('ministra') || sm.role_id === 'role-ministracao')
    );
  };

  const schedules = store.schedules
    .filter((s) => {
      if (filterView === 'published') return s.status === 'published';
      if (filterView === 'draft') return s.status === 'draft';
      return true;
    })
    .sort((a, b) => (b.service?.date || '').localeCompare(a.service?.date || ''));

  const handleOpenWizard = () => {
    setWizardStep(1);
    handleApplyPreset(FIXED_SERVICE_PRESETS[0]);
    setSelectedMembers([
      { member_id: member.id, role_id: store.roles[0]?.id || '' }
    ]);
    setRepertoireResponsibleId(member.id);
    setShowCreateModal(true);
  };

  const toggleMemberSelection = (memberId: string) => {
    const exists = selectedMembers.find((m) => m.member_id === memberId);
    if (exists) {
      setSelectedMembers(selectedMembers.filter((m) => m.member_id !== memberId));
      if (repertoireResponsibleId === memberId) {
        setRepertoireResponsibleId('');
      }
    } else {
      const targetMember = store.members.find((m) => m.id === memberId);
      const defaultRole = targetMember?.roles?.[0]?.id || store.roles[0]?.id || '';
      setSelectedMembers([...selectedMembers, { member_id: memberId, role_id: defaultRole }]);
    }
  };

  const updateMemberRole = (memberId: string, roleId: string) => {
    setSelectedMembers(
      selectedMembers.map((m) => (m.member_id === memberId ? { ...m, role_id: roleId } : m))
    );
    const roleObj = store.roles.find((r) => r.id === roleId);
    if (roleObj?.name?.toLowerCase().includes('ministra') || roleId === 'role-ministracao') {
      setRepertoireResponsibleId(memberId);
      const targetMember = store.members.find((m) => m.id === memberId);
      showToast(`${targetMember?.profile?.full_name || 'Integrante'} definido como Ministração (Responsável pelo Louvor e Repertório)!`, 'info');
    }
  };

  const handleFinishWizard = (status: 'draft' | 'published') => {
    if (!newTitle.trim() || !newDate || !newStartTime) {
      showToast('Por favor, preencha os dados do culto.', 'error');
      return;
    }
    if (selectedMembers.length === 0) {
      showToast('Selecione pelo menos um integrante para a equipe.', 'error');
      return;
    }

    const finalNotes = newHasRehearsal ? (newNotes.trim() || undefined) : undefined;

    // 1. Create service
    const service = store.addService({
      title: newTitle,
      service_type: newTitle.includes('Quarta')
        ? 'Culto de Quarta'
        : newTitle.includes('Sexta')
        ? 'Culto de Sexta'
        : newTitle.toLowerCase().includes('ceia')
        ? 'Culto de Santa Ceia'
        : newTitle.includes('EBD')
        ? 'EBD - Escola Bíblica'
        : 'Culto de Domingo',
      date: newDate,
      start_time: newStartTime,
      location: newLocation,
      notes: finalNotes,
      status: 'scheduled',
    });

    // 2. Create schedule
    const newSch = store.createSchedule({
      service_id: service.id,
      repertoire_responsible_id: repertoireResponsibleId || selectedMembers[0].member_id,
      members: selectedMembers,
      notes: finalNotes,
      status,
    });

    setShowCreateModal(false);
    setSelectedScheduleId(newSch.id);
    setJustCreatedSchedule(newSch);
    showToast(
      status === 'published' ? 'Escala criada e publicada com sucesso!' : 'Rascunho de escala salvo!',
      'success'
    );
  };

  const handlePublishExisting = (schId: string) => {
    store.publishSchedule(schId);
    showToast('Escala publicada! Todos os membros foram notificados.', 'success');
  };

  const handleQuickExportSinglePDF = async (sch: Schedule) => {
    setIsExportingPDFId(sch.id);
    try {
      const setlist = store.getSetlistByServiceId(sch.service_id);
      const schNote = sch.notes || sch.service?.notes || '';
      const doc = generateSingleSchedulePDF(sch, store.ministry, setlist, { rehearsalNote: schNote });
      const sTitle = (sch.service?.title || 'culto')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const sDate = sch.service?.date || 'data';
      const fileName = `escala-${sTitle}-${sDate}.pdf`;
      const title = `Escala de Louvor — ${sch.service?.title}`;
      const text = `📄 *Escala de Louvor — ${sch.service?.title}*\n🗓 Data: ${formatDateBR(sch.service?.date || '')} às ${sch.service?.start_time}${schNote ? `\n📌 Ensaio / Aviso: ${schNote}` : ''}\n👥 Segue o arquivo PDF com todas as informações e equipe escalada.`;

      const res = await downloadOrShareSchedulePDF(doc, fileName, title, text, true);
      if (res.downloaded) {
        showToast('PDF da escala gerado e baixado com sucesso!', 'success');
      } else {
        // Fallback for desktop sandboxed environments: open modal with direct link
        setPdfInitialSchedule(sch);
        setShowPDFModal(true);
        showToast('PDF gerado com sucesso! Abrindo opções para salvar.', 'info');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao exportar PDF da escala.', 'error');
    } finally {
      setIsExportingPDFId(null);
    }
  };

  const shareWhatsApp = (sch: Schedule) => {
    if (!sch.service) return;
    const s = sch.service;
    let text = `📅 *ESCALA DE LOUVOR — ${s.title}*\n🗓 *Data:* ${s.date} às ${s.start_time}\n📍 *Local:* ${s.location}\n\n`;
    const ministracao = sch.repertoire_responsible?.profile?.full_name || store.getMinistracaoMember(sch.service_id)?.profile?.full_name;
    if (ministracao) {
      text += `🎤 *Ministração (Resp. pelo Louvor):* ${ministracao}\n\n`;
    }
    const note = sch.notes || sch.service?.notes;
    if (note) {
      text += `📌 *Ensaio / Recado:* ${note}\n\n`;
    } else if (!isRehearsalSuggestedForService(sch.service)) {
      text += `📌 *Ensaio:* Sem ensaio programado para este culto.\n\n`;
    }
    text += `👥 *EQUIPE ESCALADA:*\n`;
    sch.members?.forEach((sm) => {
      text += `• ${sm.member?.profile?.full_name}: ${sm.role?.name || 'Vocal'}\n`;
    });
    text += `\nPor favor, confirmem sua presença no aplicativo LOUVOR IENOV!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Escalas do Ministério
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            Organização dos cultos, escalação da equipe e geração de PDF para WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export PDF Button (Dia / Semana / Mês) */}
          <button
            onClick={() => {
              setPdfInitialSchedule(null);
              setShowPDFModal(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 active:scale-95 transition"
            title="Gerar PDF da escala para enviar no grupo do WhatsApp"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>Gerar PDF (Dia / Semana / Mês)</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenWizard}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-md shadow-indigo-600/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Escala</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterView('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterView === 'all'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Todas as Escalas ({store.schedules.length})
        </button>
        <button
          onClick={() => setFilterView('published')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterView === 'published'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Publicadas
        </button>
        <button
          onClick={() => setFilterView('draft')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            filterView === 'draft'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Rascunhos
        </button>
      </div>

      {/* Schedules List (Section 21: Clean cards) */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Nenhuma escala encontrada
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-semibold">
              Crie a primeira escala para organizar a equipe e repertório do próximo culto.
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenWizard}
                className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Escala</span>
              </button>
            )}
          </div>
        ) : (
          schedules.map((sch) => {
            const confirmedCount = sch.members?.filter((m) => m.confirmation_status === 'confirmed').length || 0;
            const declinedCount = sch.members?.filter((m) => m.confirmation_status === 'declined').length || 0;
            const pendingCount = sch.members?.filter((m) => m.confirmation_status === 'pending').length || 0;
            const totalCount = sch.members?.length || 0;
            const setlist = store.getSetlistByServiceId(sch.service_id);

            return (
              <div
                key={sch.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                        {sch.service?.date} • {sch.service?.start_time}
                      </span>
                      {sch.status === 'draft' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Rascunho
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Publicada
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {sch.service?.title}
                    </h2>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                      📍 {sch.service?.location}
                    </p>
                  </div>

                  {/* Confirmation Stats pills */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-xl">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {confirmedCount}
                    </span>
                    {pendingCount > 0 && (
                      <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-xl">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {pendingCount}
                      </span>
                    )}
                    {declinedCount > 0 && (
                      <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-xl">
                        <XCircle className="w-3.5 h-3.5" />
                        {declinedCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Roster with Roles */}
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Equipe Escalada ({totalCount}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {sch.members?.map((sm) => {
                      const isMinistracaoMember =
                        sm.role?.name?.toLowerCase().includes('ministra') ||
                        sm.role_id === 'role-ministracao' ||
                        sch.repertoire_responsible_id === sm.ministry_member_id;

                      return (
                        <div
                          key={sm.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                            isMinistracaoMember
                              ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-400/60 dark:border-amber-600/40 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={sm.member?.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {sm.member?.profile?.full_name?.split(' ')[0]}
                              </p>
                              <p className={`text-[10px] font-bold truncate flex items-center gap-1 ${
                                isMinistracaoMember ? 'text-amber-800 dark:text-amber-300' : 'text-indigo-600 dark:text-indigo-400 font-semibold'
                              }`}>
                                {isMinistracaoMember ? '🎤 Ministração' : (sm.role?.name || 'Vocal')}
                              </p>
                            </div>
                          </div>

                          {/* confirmation icon */}
                          <div className="shrink-0">
                            {sm.confirmation_status === 'confirmed' ? (
                              <span className="text-[10px] font-bold text-emerald-600">🟢 Ok</span>
                            ) : sm.confirmation_status === 'declined' ? (
                              <span className="text-[10px] font-bold text-rose-500">🔴 Recusou</span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-500">🟡 Pend.</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Responsible for Louvor / Repertoire */}
                <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎤</span>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        Ministração (Resp. pelo Louvor):
                      </span>{' '}
                      <strong className="text-amber-900 dark:text-amber-300">
                        {sch.repertoire_responsible?.profile?.full_name || store.getMinistracaoMember(sch.service_id)?.profile?.full_name || 'A definir'}
                      </strong>
                    </div>
                  </div>
                  {setlist && setlist.songs && setlist.songs.length > 0 ? (
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg text-[11px] flex items-center gap-1 self-start sm:self-auto">
                      <CheckCircle className="w-3 h-3" />
                      {setlist.songs.length} músicas definidas
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 self-start sm:self-auto">
                      <Music className="w-3 h-3" />
                      Músicas a definir pela ministração
                    </span>
                  )}
                </div>

                {/* Leader & Ministrante observation/rehearsal banner */}
                {(sch.notes || sch.service?.notes) ? (
                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex items-start gap-2.5 text-xs">
                    <span className="text-base shrink-0">🎵</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-sky-900 dark:text-sky-300">
                        {sch.notes?.toLowerCase().includes('ensaio') || sch.service?.notes?.toLowerCase().includes('ensaio')
                          ? 'Ensaio & Orientações da Liderança / Ministrante:'
                          : 'Observação da Liderança / Ministrante:'}
                      </span>
                      <p className="text-sky-950 dark:text-sky-200 font-medium mt-0.5 whitespace-pre-wrap">
                        {sch.notes || sch.service?.notes}
                      </p>
                    </div>
                  </div>
                ) : (
                  !isRehearsalSuggestedForService(sch.service) && (
                    <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span>ℹ️</span> Culto de dia de semana (Quarta/Sexta): sem ensaio programado.
                      </span>
                      {canEditSchedule(sch) && (
                        <button
                          onClick={() => setEditingSchedule(sch)}
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          Agendar ensaio
                        </button>
                      )}
                    </div>
                  )
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Edit Schedule Button - Available for Admin and Ministrante */}
                    {canEditSchedule(sch) && (
                      <button
                        onClick={() => setEditingSchedule(sch)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold transition shadow-xs active:scale-95"
                        title="Líder e Ministrante: editar integrantes, ministração, ensaio, recados ou status desta escala"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    <button
                      onClick={() => shareWhatsApp(sch)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {/* PDF button for single schedule */}
                    <button
                      onClick={() => handleQuickExportSinglePDF(sch)}
                      disabled={isExportingPDFId === sch.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition shadow-xs active:scale-95"
                      title="Baixar arquivo PDF desta escala no seu computador"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>{isExportingPDFId === sch.id ? 'Gerando...' : 'Baixar PDF'}</span>
                    </button>

                    {setlist && (
                      <button
                        onClick={() => {
                          setSelectedSetlistId(setlist.id);
                          setActiveTab('repertorios');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition"
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Ver Repertório</span>
                      </button>
                    )}
                  </div>

                  {sch.status === 'draft' && isAdmin && (
                    <button
                      onClick={() => handlePublishExisting(sch.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>PUBLICAR ESCALA</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Creation Wizard Modal (Section 22: Steps on Mobile) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400">
                  Etapa {wizardStep} de 3
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {wizardStep === 1
                    ? 'Dados do Culto'
                    : wizardStep === 2
                    ? 'Escalação da Equipe'
                    : 'Responsável e Publicação'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Step 1: Culto, Data, Horário */}
            {wizardStep === 1 && (
              <div className="mt-4 space-y-3.5">
                {/* Seletor de Tipo de Culto (Configuração Automática) */}
                <div className="rounded-2xl p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Seletor de Tipo de Culto</span>
                    </label>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold bg-white dark:bg-indigo-900/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700 shadow-2xs">
                      Aplica horários automáticos
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Selecione o tipo de culto para configurar automaticamente o nome, horário oficial (como as <strong>18:00 para o Culto da Noite</strong>), dia sugerido e ensaios:
                  </p>

                  {/* Visual Service Selector Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {FIXED_SERVICE_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id || newTitle === preset.title;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`p-2.5 rounded-2xl text-left border transition relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                              : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {preset.badge.split(' ')[0]} {preset.title}
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md">
                              ⏰ {preset.defaultStartTime}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                              {preset.suggestsRehearsal ? 'Com ensaio' : 'Sem ensaio'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Selector */}
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      Seletor rápido:
                    </span>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => {
                        const target = FIXED_SERVICE_PRESETS.find((p) => p.id === e.target.value);
                        if (target) handleApplyPreset(target);
                        else setSelectedPresetId(e.target.value);
                      }}
                      className="w-full text-xs font-bold rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white"
                    >
                      {FIXED_SERVICE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.badge} — Início às {p.defaultStartTime} ({p.suggestsRehearsal ? 'Com ensaio' : 'Sem ensaio'})
                        </option>
                      ))}
                      <option value="custom">⚙️ Personalizado / Outro Culto</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome / Tipo de Culto
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Culto de Domingo, Culto de Jovens..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data do Culto
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Localização / Sala
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ex: Templo Principal, Auditório..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Observation / Note from Leader & Ministrante */}
                <div className="rounded-2xl p-3.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-xs font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Definição de Ensaio & Recado</span>
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isRehearsalSuggestedForService({ title: newTitle, date: newDate })
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isRehearsalSuggestedForService({ title: newTitle, date: newDate })
                        ? 'Domingo / Santa Ceia: ensaio previsto'
                        : 'Quarta / Sexta: sem ensaio padrão'}
                    </span>
                  </div>

                  {/* Rehearsal selector toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-200 dark:border-sky-800/50">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Haverá ensaio para este culto?
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setNewHasRehearsal(false);
                          setNewNotes('');
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                          !newHasRehearsal
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-xs border border-rose-200 dark:border-rose-800'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        🚫 Não haverá ensaio
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewHasRehearsal(true);
                          if (!newNotes) {
                            setNewNotes('O ensaio será na quinta-feira às 19:30');
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                          newHasRehearsal
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        🎵 Sim, haverá ensaio
                      </button>
                    </div>
                  </div>

                  {newHasRehearsal ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Ex: O ensaio será na quinta-feira às 19:30."
                        className="w-full rounded-xl border border-sky-300 dark:border-sky-700/80 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {quickObservationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewNotes(suggestion)}
                            className="text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 transition shadow-xs"
                          >
                            + {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span>✅ <strong>Sem ensaio programado.</strong> A escala e o PDF sairão limpos sem aviso de ensaio.</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <span>Próximo: Escolher Equipe</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Wizard Step 2: Equipe e Funções */}
            {wizardStep === 2 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Toque nos membros para adicionar/remover e escolha a função de cada um:
                </p>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {store.members.map((m) => {
                    const isSelected = selectedMembers.some((sm) => sm.member_id === m.id);
                    const currentAssignment = selectedMembers.find((sm) => sm.member_id === m.id);
                    const memberAvailability = store.getMemberAvailability(m.id, newDate);

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl border transition ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleMemberSelection(m.id)}
                            className="flex items-center gap-3 text-left flex-1 min-w-0"
                          >
                            <img
                              src={m.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {m.profile?.full_name}
                              </p>
                              {/* Availability indicator */}
                              <div className="text-[10px] flex items-center gap-1 font-semibold">
                                {memberAvailability?.status === 'available' ? (
                                  <span className="text-emerald-600">🟢 Disponível</span>
                                ) : memberAvailability?.status === 'unavailable' ? (
                                  <span className="text-rose-500">🔴 Marcado Indisponível</span>
                                ) : (
                                  <span className="text-slate-600 dark:text-slate-300">⚪ Sem aviso</span>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="shrink-0 ml-2">
                            {isSelected ? (
                              <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px]">
                                Escalado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleMemberSelection(m.id)}
                                className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]"
                              >
                                + Escalar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Role selection dropdown if selected */}
                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Função no Culto:
                              </span>
                              {(currentAssignment?.role_id === 'role-ministracao' ||
                                store.roles.find((r) => r.id === currentAssignment?.role_id)?.name.toLowerCase().includes('ministra')) && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5">
                                  🎤 Resp. Louvor
                                </span>
                              )}
                            </div>
                            <select
                              value={currentAssignment?.role_id}
                              onChange={(e) => updateMemberRole(m.id, e.target.value)}
                              className="rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs px-2.5 py-1 font-bold text-slate-800 dark:text-slate-100"
                            >
                              {store.roles.map((r) => {
                                const isMin = r.name.toLowerCase().includes('ministra') || r.id === 'role-ministracao';
                                return (
                                  <option key={r.id} value={r.id}>
                                    {isMin ? '🎤 Ministração (Resp. pelo Louvor)' : r.name}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    disabled={selectedMembers.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <span>Avançar ({selectedMembers.length} selecionados)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Wizard Step 3: Ministração do Culto & Publicação */}
            {wizardStep === 3 && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-400/50 dark:border-amber-600/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">🎤</span>
                    <label className="block text-xs font-black text-slate-900 dark:text-amber-300 uppercase tracking-wide">
                      Ministração do Culto (Responsável pelo Louvor)
                    </label>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-3 font-semibold">
                    Essa função dará ao integrante o poder de escolher as músicas que serão cantadas no culto. Ele será o responsável pelo louvor no dia da escala.
                  </p>
                  <select
                    value={repertoireResponsibleId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setRepertoireResponsibleId(newId);
                      // Auto-assign role-ministracao to this member if available
                      const roleMinistracao = store.roles.find(
                        (r) => r.name.toLowerCase().includes('ministra') || r.id === 'role-ministracao'
                      );
                      if (roleMinistracao) {
                        setSelectedMembers((prev) =>
                          prev.map((sm) =>
                            sm.member_id === newId ? { ...sm, role_id: roleMinistracao.id } : sm
                          )
                        );
                      }
                    }}
                    className="w-full rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white"
                  >
                    {selectedMembers.map((sm) => {
                      const m = store.members.find((mem) => mem.id === sm.member_id);
                      const currentRole = store.roles.find((r) => r.id === sm.role_id);
                      return (
                        <option key={sm.member_id} value={sm.member_id}>
                          {m?.profile?.full_name} — {currentRole?.name || 'Membro'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Final Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Culto:</span>
                    <strong className="text-slate-900 dark:text-white">{newTitle}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Data / Hora:</span>
                    <strong className="text-slate-900 dark:text-white">{newDate} às {newStartTime}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Local:</span>
                    <strong className="text-slate-900 dark:text-white">{newLocation}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Integrantes:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedMembers.length} pessoas</strong>
                  </div>
                  {newNotes && (
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">Observação:</span>
                      <strong className="text-sky-700 dark:text-sky-300 max-w-[220px] truncate text-right">{newNotes}</strong>
                    </div>
                  )}
                </div>

                {/* Big Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleFinishWizard('published')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>PUBLICAR ESCALA IMEDIATAMENTE</span>
                  </button>

                  <button
                    onClick={() => handleFinishWizard('draft')}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                  >
                    Salvar Como Rascunho (Não notificar ainda)
                  </button>
                </div>

                <div className="pt-1 flex justify-start">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline"
                  >
                    ← Voltar para Equipe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instant Post-Creation PDF & WhatsApp Dialog */}
      {justCreatedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center font-bold text-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                Escala Criada com Sucesso!
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                {justCreatedSchedule.service?.title} • {formatDateBR(justCreatedSchedule.service?.date || '')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Ministração (Resp. Louvor):</span>
                <strong className="text-amber-900 dark:text-amber-300 font-black">
                  {justCreatedSchedule.repertoire_responsible?.profile?.full_name ||
                    store.getMinistracaoMember(justCreatedSchedule.service_id)?.profile?.full_name ||
                    'A definir'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Equipe Escalada:</span>
                <strong className="text-slate-900 dark:text-white font-bold">
                  {justCreatedSchedule.members?.length || 0} integrantes
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Status:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {justCreatedSchedule.status === 'published'
                    ? 'Publicada Oficialmente'
                    : 'Salva como Rascunho'}
                </strong>
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleQuickExportSinglePDF(justCreatedSchedule);
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-md shadow-indigo-600/25 active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Gerar e Baixar PDF Organizado</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  shareWhatsApp(justCreatedSchedule);
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md shadow-emerald-600/25 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no Grupo do WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setJustCreatedSchedule(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal (Dia, Semana, Mês) */}
      <SchedulePDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        initialSchedule={pdfInitialSchedule}
      />

      {/* Edit Schedule Modal (Editable anytime, even after published) */}
      <EditScheduleModal
        isOpen={!!editingSchedule}
        schedule={editingSchedule}
        onClose={() => setEditingSchedule(null)}
        onUpdated={(updated) => {
          setEditingSchedule(null);
        }}
        onExportPDF={(targetSch) => {
          setEditingSchedule(null);
          setPdfInitialSchedule(targetSch);
          setShowPDFModal(true);
        }}
      />
    </div>
  );
};
