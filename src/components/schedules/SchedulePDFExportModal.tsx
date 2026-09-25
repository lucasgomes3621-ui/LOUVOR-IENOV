import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Schedule } from '../../types/database';
import {
  generateSingleSchedulePDF,
  generateWeeklySchedulesPDF,
  generateMonthlySchedulesPDF,
  downloadOrShareSchedulePDF,
  formatDateBR
} from '../../utils/pdfExport';
import { isRehearsalSuggestedForService } from '../../utils/churchScheduleRules';
import {
  FileText,
  Calendar,
  CalendarDays,
  Share2,
  Download,
  X,
  CheckCircle,
  Clock,
  Sparkles,
  Users,
  ExternalLink
} from 'lucide-react';

interface SchedulePDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSchedule?: Schedule | null;
}

export const SchedulePDFExportModal: React.FC<SchedulePDFExportModalProps> = ({
  isOpen,
  onClose,
  initialSchedule
}) => {
  const { showToast } = useApp();
  const [exportType, setExportType] = useState<'day' | 'week' | 'month'>(
    initialSchedule ? 'day' : 'week'
  );

  const schedules = store.schedules;
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    initialSchedule?.id || schedules[0]?.id || ''
  );

  // Month selector (default current month YYYY-MM)
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [isGenerating, setIsGenerating] = useState(false);

  // Layout customizers matching the church sheet
  const [rehearsalNote, setRehearsalNote] = useState('');
  const [includeSetlist, setIncludeSetlist] = useState(false);
  const [lastGeneratedWaLink, setLastGeneratedWaLink] = useState<string | null>(null);
  const [downloadedInfo, setDownloadedInfo] = useState<{ url: string; fileName: string } | null>(null);

  const updateRehearsalForSchedule = (sch: Schedule | undefined) => {
    if (!sch) return;
    const customNote = sch.notes || sch.service?.notes;
    if (customNote !== undefined && customNote !== null) {
      setRehearsalNote(customNote);
    } else {
      const isEligible = isRehearsalSuggestedForService(sch.service);
      setRehearsalNote(isEligible ? 'ENSAIO QUINTA FEIRA' : '');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDownloadedInfo(null);
      setLastGeneratedWaLink(null);
      const target = initialSchedule || schedules.find((s) => s.id === selectedScheduleId) || schedules[0];
      if (initialSchedule) {
        setSelectedScheduleId(initialSchedule.id);
        setExportType('day');
      }
      updateRehearsalForSchedule(target);
    }
  }, [initialSchedule, isOpen]);

  if (!isOpen) return null;

  // Helpers for calculations
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  // Helper for current week schedules
  const getWeekSchedules = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    // Start from Monday (or Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);

    const startIso = startOfWeek.toISOString().slice(0, 10);
    const endIso = endOfWeek.toISOString().slice(0, 10);

    const filtered = schedules.filter((sch) => {
      const d = sch.service?.date;
      return d && d >= startIso && d <= endIso;
    });

    // If no schedules in strict this week, return next upcoming ones
    if (filtered.length === 0) {
      return schedules.slice(0, 4);
    }
    return filtered;
  };

  // Helper for month schedules
  const getMonthSchedules = () => {
    return schedules.filter((sch) => {
      return sch.service?.date?.startsWith(selectedMonth);
    });
  };

  const weekSchedules = getWeekSchedules();
  const monthSchedules = getMonthSchedules();

  const handleGenerateAndExport = async (action: 'download' | 'share') => {
    setIsGenerating(true);
    try {
      let doc;
      let fileName = 'escala-louvor-ienov.pdf';
      let title = 'Escala de Louvor IENOV';
      let text = 'Segue a escala de louvor oficial em PDF.';

      const pdfOptions = {
        rehearsalNote: rehearsalNote.trim() || undefined,
        includeSetlist
      };

      if (exportType === 'day') {
        if (!selectedSchedule) {
          showToast('Selecione um culto para gerar o PDF.', 'error');
          setIsGenerating(false);
          return;
        }
        const setlist = store.getSetlistByServiceId(selectedSchedule.service_id);
        doc = generateSingleSchedulePDF(selectedSchedule, store.ministry, setlist, pdfOptions);
        const sDate = selectedSchedule.service?.date || 'data';
        const sTitle = (selectedSchedule.service?.title || 'culto')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        fileName = `escala-${sTitle}-${sDate}.pdf`;
        title = `Escala de Louvor — ${selectedSchedule.service?.title}`;
        text = `📄 *Escala de Louvor — ${selectedSchedule.service?.title}*\nData: ${formatDateBR(selectedSchedule.service?.date || '')}\nConfira o arquivo PDF oficial em anexo.`;
      } else if (exportType === 'week') {
        doc = generateWeeklySchedulesPDF(
          weekSchedules,
          store.ministry,
          (id) => store.getSetlistByServiceId(id),
          pdfOptions
        );
        fileName = `escala-semanal-louvor-${new Date().toISOString().slice(0, 10)}.pdf`;
        title = 'Escala Semanal de Louvor IENOV';
        text = `📄 *Escala Semanal de Louvor — LOUVOR IENOV*\nConfira em anexo o arquivo PDF oficial com os cultos e equipes da semana.`;
      } else {
        const [year, month] = selectedMonth.split('-');
        const monthNames = [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro'
        ];
        const monthLabel = `${monthNames[parseInt(month, 10) - 1]} de ${year}`;
        doc = generateMonthlySchedulesPDF(
          monthSchedules,
          store.ministry,
          monthLabel,
          (id) => store.getSetlistByServiceId(id),
          pdfOptions
        );
        fileName = `escala-mensal-louvor-${selectedMonth}.pdf`;
        title = `Escala Mensal de Louvor — ${monthLabel}`;
        text = `📄 *Escala Mensal de Louvor — ${monthLabel}*\nSegue o PDF oficial de todas as escalas e equipes do mês.`;
      }

      const isDownloadOnly = action === 'download';
      const res = await downloadOrShareSchedulePDF(doc, fileName, title, text, isDownloadOnly);

      if (res.blobUrl) {
        setDownloadedInfo({
          url: res.blobUrl,
          fileName
        });
      }

      if (action === 'share') {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `${text}\n\n(Anexe o PDF "${fileName}" baixado no seu dispositivo)`
        )}`;
        setLastGeneratedWaLink(waUrl);

        if (res.shared) {
          showToast('Escala em PDF compartilhada com sucesso!', 'success');
        } else {
          showToast('PDF pronto! Você pode anexá-lo diretamente no WhatsApp.', 'success');
          try {
            window.open(waUrl, '_blank');
          } catch (e) {
            // Handled gracefully inside iframe
          }
        }
      } else {
        showToast('PDF da escala gerado e baixado com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao gerar o PDF da escala: ' + (err?.message || 'Tente novamente'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Gerar PDF Organizado da Escala
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Para envio aos membros e compartilhamento no grupo do WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector (Dia / Semana / Mês) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Selecione o tipo de escala para o PDF:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setExportType('day')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                exportType === 'day'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs">Do Culto (Dia)</span>
            </button>

            <button
              type="button"
              onClick={() => setExportType('week')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                exportType === 'week'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Da Semana</span>
            </button>

            <button
              type="button"
              onClick={() => setExportType('month')}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                exportType === 'month'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 font-black'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs">Do Mês Inteiro</span>
            </button>
          </div>
        </div>

        {/* Dynamic Config Area */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
          {exportType === 'day' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Escolha o Culto / Escala:
              </label>
              <select
                value={selectedScheduleId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedScheduleId(newId);
                  const target = schedules.find((s) => s.id === newId);
                  updateRehearsalForSchedule(target);
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDateBR(s.service?.date || '')} — {s.service?.title} (
                    {s.members?.length || 0} integrantes)
                  </option>
                ))}
              </select>

              {selectedSchedule && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <span>🎤 Ministração:</span>
                    <span>
                      {selectedSchedule.repertoire_responsible?.profile?.full_name ||
                        store.getMinistracaoMember(selectedSchedule.service_id)?.profile?.full_name ||
                        'A definir'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                    Inclui equipe completa ({selectedSchedule.members?.length || 0} integrantes) e
                    músicas cadastradas.
                  </p>
                </div>
              )}
            </div>
          )}

          {exportType === 'week' && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cultos desta Semana:
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                  {weekSchedules.length} escalas inclusas
                </span>
              </div>
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {weekSchedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {sch.service?.title}
                      </span>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 ml-2 font-semibold">
                        {formatDateBR(sch.service?.date || '')} às {sch.service?.start_time}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {sch.members?.length || 0} pessoas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exportType === 'month' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mês de Referência:
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Cultos encontrados no mês:</span>{' '}
                <strong className="text-slate-900 dark:text-white font-black">
                  {monthSchedules.length} cultos cadastrados
                </strong>
              </div>
            </div>
          )}

          {/* Rehearsal Note & Options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Aviso / Ensaio no rodapé da folha PDF:
                </label>
                {selectedSchedule && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isRehearsalSuggestedForService(selectedSchedule.service)
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isRehearsalSuggestedForService(selectedSchedule.service)
                      ? 'Domingo / Santa Ceia: ensaio sugerido'
                      : 'Quarta / Sexta: sem ensaio padrão'}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={rehearsalNote}
                onChange={(e) => setRehearsalNote(e.target.value)}
                placeholder="Ex: ENSAIO QUINTA FEIRA (ou deixe em branco caso não haja ensaio)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Decisão do Líder e Ministrante. Se preenchido, será impresso centralizado no rodapé da escala oficial.
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setRehearsalNote('')}
                  className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 transition shadow-xs"
                >
                  🚫 Sem ensaio (limpar)
                </button>
                {[
                  'ENSAIO QUINTA FEIRA',
                  'O ensaio será na quinta-feira às 19:30',
                  'Ensaio domingo às 08:00 (Santa Ceia / EBD)',
                  'Ensaio sábado às 18:00',
                  'Chegar com 20 minutos de antecedência',
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRehearsalNote(sug)}
                    className="text-[10px] font-semibold bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-slate-700 transition"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={includeSetlist}
                onChange={(e) => setIncludeSetlist(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Incluir tabela de repertório (músicas e tons)
              </span>
            </label>
          </div>
        </div>

        {/* Visual Badge confirming layout */}
        <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed font-semibold">
            <strong className="text-slate-900 dark:text-white block font-bold">
              Layout Oficial Idêntico ao Modelo da Igreja
            </strong>
            Tabela clássica centralizada com <span className="font-bold text-indigo-700 dark:text-indigo-300">MINISTRAÇÃO</span> no topo, seguida por Back Vocal, Instrumentos (Violão, Baixo, Guitarra, Bateria, Teclado) e Sonoplastia, pronta para envio no grupo.
          </div>
        </div>

        {/* Downloaded Confirmation & Direct Link (Desktop & Mobile Fallback) */}
        {downloadedInfo && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400/60 dark:border-emerald-600/50 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>PDF Pronto: {downloadedInfo.fileName}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                Download iniciado
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              O arquivo foi enviado para a sua pasta de downloads. Se o seu navegador ou antivírus pausou o salvamento automático:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={downloadedInfo.url}
                download={downloadedInfo.fileName}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Salvar Arquivo PDF no Computador</span>
              </a>
              <a
                href={downloadedInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir / Visualizar PDF em Nova Aba</span>
              </a>
            </div>

            {/* Embedded Live PDF Preview Frame */}
            <div className="mt-2 rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700/70 bg-slate-100 dark:bg-slate-900 shadow-inner">
              <iframe
                src={`${downloadedInfo.url}#toolbar=0&navpanes=0`}
                title="Pré-visualização da Escala em PDF"
                className="w-full h-64 sm:h-72 border-0"
              />
            </div>
          </div>
        )}

        {/* WhatsApp Link Banner (if prepared) */}
        {lastGeneratedWaLink && (
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
              Mensagem com dados da escala pronta para envio no WhatsApp.
            </span>
            <a
              href={lastGeneratedWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              <span>Abrir WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Action Buttons: Baixar PDF & Compartilhar no WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerateAndExport('download')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-md shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Gerando PDF...' : 'Baixar Arquivo PDF'}</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerateAndExport('share')}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1 text-xs">
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
            💡 Formato padrão A4 com Ministração no topo.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
