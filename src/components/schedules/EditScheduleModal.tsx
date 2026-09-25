import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Schedule } from '../../types/database';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  Trash2,
  Plus,
  Sparkles,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import {
  isRehearsalSuggestedForService,
  FIXED_SERVICE_PRESETS
} from '../../utils/churchScheduleRules';

interface EditScheduleModalProps {
  isOpen: boolean;
  schedule: Schedule | null;
  onClose: () => void;
  onUpdated: (updated: Schedule) => void;
  onExportPDF?: (schedule: Schedule) => void;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  schedule,
  onClose,
  onUpdated,
  onExportPDF
}) => {
  const { showToast } = useApp();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [hasRehearsal, setHasRehearsal] = useState(true);
  const [repertoireResponsibleId, setRepertoireResponsibleId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Array<{ member_id: string; role_id: string }>>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (schedule && isOpen) {
      setTitle(schedule.service?.title || 'Culto');
      setDate(schedule.service?.date || '');
      setStartTime(schedule.service?.start_time || '18:00');
      setLocation(schedule.service?.location || 'Templo Principal');
      const initialNotes = schedule.notes || schedule.service?.notes || '';
      setNotes(initialNotes);
      const isEligible = isRehearsalSuggestedForService(schedule.service);
      if (initialNotes) {
        setHasRehearsal(!initialNotes.toLowerCase().includes('sem ensaio'));
      } else {
        setHasRehearsal(isEligible);
      }
      setStatus(schedule.status === 'draft' ? 'draft' : 'published');

      // Pre-fill members
      const currentMembers = (schedule.members || []).map((sm) => ({
        member_id: sm.ministry_member_id,
        role_id: sm.role_id || sm.role?.id || store.roles[0]?.id || ''
      }));
      setSelectedMembers(currentMembers);

      // Pre-fill ministração
      setRepertoireResponsibleId(
        schedule.repertoire_responsible_id ||
        schedule.repertoire_responsible?.id ||
        currentMembers[0]?.member_id ||
        ''
      );
    }
  }, [schedule, isOpen]);

  if (!isOpen || !schedule) return null;

  const quickObservationSuggestions = [
    'O ensaio será na quinta-feira às 19:30',
    'Ensaio quinta-feira',
    'Chegar com 20 minutos de antecedência para oração e passagem de som',
    'Trazer cifras ou tablet para o ensaio',
    'Uniforme / Vestimenta: Tons escuros'
  ];

  const handleToggleMember = (memberId: string) => {
    const exists = selectedMembers.some((m) => m.member_id === memberId);
    if (exists) {
      if (selectedMembers.length <= 1) {
        showToast('A escala deve conter pelo menos um integrante.', 'error');
        return;
      }
      setSelectedMembers(selectedMembers.filter((m) => m.member_id !== memberId));
      if (repertoireResponsibleId === memberId) {
        const remaining = selectedMembers.filter((m) => m.member_id !== memberId);
        setRepertoireResponsibleId(remaining[0]?.member_id || '');
      }
    } else {
      const targetMember = store.members.find((m) => m.id === memberId);
      const defaultRole = targetMember?.roles?.[0]?.id || store.roles[0]?.id || '';
      setSelectedMembers([...selectedMembers, { member_id: memberId, role_id: defaultRole }]);
    }
  };

  const handleUpdateMemberRole = (memberId: string, roleId: string) => {
    setSelectedMembers((prev) =>
      prev.map((m) => (m.member_id === memberId ? { ...m, role_id: roleId } : m))
    );
    const roleObj = store.roles.find((r) => r.id === roleId);
    if (roleObj?.name?.toLowerCase().includes('ministra') || roleId === 'role-ministracao') {
      setRepertoireResponsibleId(memberId);
    }
  };

  const handleSave = (andExportPdf = false) => {
    if (!title.trim() || !date) {
      showToast('Por favor, informe o título e a data do culto.', 'error');
      return;
    }
    if (selectedMembers.length === 0) {
      showToast('Selecione pelo menos um integrante na equipe.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const updated = store.updateSchedule(schedule.id, {
        serviceData: {
          title: title.trim(),
          date,
          start_time: startTime,
          location: location.trim(),
          notes: notes.trim()
        },
        notes: notes.trim(),
        repertoire_responsible_id: repertoireResponsibleId || selectedMembers[0]?.member_id,
        members: selectedMembers,
        status
      });

      if (updated) {
        showToast('Escala atualizada com sucesso!', 'success');
        onUpdated(updated);
        if (andExportPdf && onExportPDF) {
          onClose();
          onExportPDF(updated);
        } else {
          onClose();
        }
      } else {
        showToast('Não foi possível atualizar a escala.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao salvar alterações da escala.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const availableMembersToAdd = store.members.filter(
    (m) => m.active && !selectedMembers.some((sm) => sm.member_id === m.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                schedule.status === 'published'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
              }`}>
                {schedule.status === 'published' ? 'Escala Publicada' : 'Rascunho'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Editar Escala
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Altere os integrantes, ministração, data e avisos/observações mesmo após a publicação.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Service Details Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Informações do Culto
            </h3>

            {/* Seletor Rápido de Tipo de Culto */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Aplicar Configuração por Tipo de Culto:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FIXED_SERVICE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTitle(preset.title);
                      setStartTime(preset.defaultStartTime);
                      if (preset.suggestsRehearsal) {
                        setHasRehearsal(true);
                        if (!notes) setNotes(preset.defaultRehearsalNote || '');
                      } else {
                        setHasRehearsal(false);
                        setNotes('');
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition ${
                      title === preset.title
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {preset.badge.split(' ')[0]} {preset.title} ({preset.defaultStartTime})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Culto *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Culto da Família, Culto de Quarta..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data do Culto *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Horário de Início *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Local
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Templo Principal"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* OBSERVATION / RECADO & ENSAIO SECTION */}
          <div className="rounded-2xl p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-950 dark:text-sky-200">
                <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Definição de Ensaio & Recados
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Líder e Ministrante: decidam se haverá ensaio para esta escala.
                  </p>
                </div>
              </div>

              {/* Status indicator tag */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start sm:self-auto ${
                  isRehearsalSuggestedForService({ title, date })
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {isRehearsalSuggestedForService({ title, date })
                  ? 'Domingo / Santa Ceia: ensaio previsto'
                  : 'Quarta / Sexta: sem ensaio padrão'}
              </span>
            </div>

            {/* Toggle Button: Haverá ensaio? */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-sky-200 dark:border-sky-800/50">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Haverá ensaio para este culto?
              </span>
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setHasRehearsal(false);
                    setNotes('');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    !hasRehearsal
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-xs border border-rose-200 dark:border-rose-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🚫 Não haverá ensaio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasRehearsal(true);
                    if (!notes) {
                      setNotes('O ensaio será na quinta-feira às 19:30');
                    }
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    hasRehearsal
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🎵 Sim, haverá ensaio
                </button>
              </div>
            </div>

            {hasRehearsal ? (
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-sky-950 dark:text-sky-200">
                  Data, horário e orientações do ensaio (impresso em destaque no rodapé do PDF e no WhatsApp):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: O ensaio será na quinta-feira às 19:30."
                  className="w-full rounded-xl border border-sky-300 dark:border-sky-700/80 bg-white dark:bg-slate-900 p-3 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
                />

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    'O ensaio será na quinta-feira às 19:30',
                    'ENSAIO QUINTA FEIRA',
                    'Ensaio domingo às 08:00 (Santa Ceia / EBD)',
                    'Ensaio sábado às 18:00',
                    'Chegar com 20 minutos de antecedência para oração',
                    'Passagem de som 30 minutos antes do culto',
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNotes(suggestion)}
                      className="text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800 transition shadow-xs"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>
                  ✅ <strong>Sem ensaio programado.</strong> A escala e o PDF sairão limpos sem aviso de ensaio.
                </span>
              </div>
            )}
          </div>

          {/* Team Members & Ministração Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Integrantes Escalados ({selectedMembers.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Marque o botão 🎤 para definir quem será a <strong>Ministração</strong> (responsável pelo louvor e músicas).
                </p>
              </div>

              {availableMembersToAdd.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberDropdown(!showAddMemberDropdown)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Integrante
                  </button>

                  {showAddMemberDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-20 max-h-56 overflow-y-auto">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                        Selecione para incluir:
                      </div>
                      {availableMembersToAdd.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            handleToggleMember(m.id);
                            setShowAddMemberDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-semibold truncate">{m.profile?.full_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List of current members */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60">
              {selectedMembers.map((sm) => {
                const memberObj = store.members.find((m) => m.id === sm.member_id);
                const isMinistracao = repertoireResponsibleId === sm.member_id;

                return (
                  <div
                    key={sm.member_id}
                    className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isMinistracao ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setRepertoireResponsibleId(sm.member_id)}
                        title={isMinistracao ? 'Ministração Selecionada' : 'Clique para definir como Ministração'}
                        className={`p-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition shrink-0 ${
                          isMinistracao
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                        }`}
                      >
                        <span className="text-sm">🎤</span>
                        <span className="text-[10px] hidden sm:inline">
                          {isMinistracao ? 'MINISTRAÇÃO' : 'Tornar Ministração'}
                        </span>
                      </button>

                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="truncate">{memberObj?.profile?.full_name || 'Integrante'}</span>
                          {isMinistracao && (
                            <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300 px-1.5 py-0.5 rounded-md uppercase">
                              Líder do Louvor
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          @{memberObj?.profile?.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Role selection dropdown */}
                      <select
                        value={sm.role_id}
                        onChange={(e) => handleUpdateMemberRole(sm.member_id, e.target.value)}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                      >
                        {store.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleToggleMember(sm.member_id)}
                        title="Remover integrante da escala"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Selection */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Status da Escala
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {status === 'published'
                  ? 'Publicada: visível para todos os integrantes no app.'
                  : 'Rascunho: visível apenas para líderes e administradores.'}
              </p>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="published">Publicada</option>
              <option value="draft">Rascunho</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {onExportPDF && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl transition"
              >
                Salvar e Gerar PDF
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
