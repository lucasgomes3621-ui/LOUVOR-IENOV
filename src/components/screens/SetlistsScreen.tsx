import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Setlist, Song } from '../../types/database';
import {
  Music,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Share2,
  ExternalLink,
  Search,
  Sparkles,
  Send,
  Eye,
  CheckCircle,
  X,
  Radio
} from 'lucide-react';

export const SetlistsScreen: React.FC = () => {
  const { member, isAdmin, isMinister, selectedSetlistId, setSelectedSetlistId, isUserMinistracaoForService, showToast } = useApp();

  // State
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(() => {
    return selectedSetlistId || store.setlists[0]?.id || null;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isStageMode, setIsStageMode] = useState(false);
  const [searchSongQuery, setSearchSongQuery] = useState('');
  const [showAddSongModal, setShowAddSongModal] = useState(false);

  // Active setlist object
  const activeSetlist = store.setlists.find((s) => s.id === activeSetlistId) || store.setlists[0];

  // Editable local state when editing
  const [editableSongs, setEditableSongs] = useState<
    Array<{
      song_id: string;
      position: number;
      key_override?: string;
      bpm_override?: number;
      notes?: string;
      song?: Song;
    }>
  >([]);

  // The member assigned to Ministração or the leader has full power to choose songs
  const isUserResponsible =
    activeSetlist?.responsible_member_id === member.id ||
    (activeSetlist?.service_id ? isUserMinistracaoForService(activeSetlist.service_id) : false);

  const canEditCurrentSetlist =
    isAdmin ||
    isMinister ||
    isUserResponsible;

  const ministracaoMember = activeSetlist ? store.getMinistracaoMember(activeSetlist.service_id) : undefined;

  const handleStartEdit = (setlist: Setlist) => {
    setActiveSetlistId(setlist.id);
    setEditableSongs(
      (setlist.songs || []).map((s, idx) => ({
        song_id: s.song_id,
        position: idx + 1,
        key_override: s.key_override || s.song?.original_key,
        bpm_override: s.bpm_override || s.song?.bpm,
        notes: s.notes || '',
        song: s.song,
      }))
    );
    setIsEditing(true);
  };

  const handleAddSongToSetlist = (song: Song) => {
    // Check if duplicate
    const alreadyAdded = editableSongs.some((s) => s.song_id === song.id);
    if (alreadyAdded) {
      showToast(`A música "${song.title}" já está no repertório.`, 'info');
    }

    const nextPos = editableSongs.length + 1;
    setEditableSongs([
      ...editableSongs,
      {
        song_id: song.id,
        position: nextPos,
        key_override: song.original_key,
        bpm_override: song.bpm,
        notes: '',
        song,
      },
    ]);
    setShowAddSongModal(false);
    showToast(`"${song.title}" adicionada ao repertório!`, 'success');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...editableSongs];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    setEditableSongs(newItems.map((item, idx) => ({ ...item, position: idx + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === editableSongs.length - 1) return;
    const newItems = [...editableSongs];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    setEditableSongs(newItems.map((item, idx) => ({ ...item, position: idx + 1 })));
  };

  const handleRemoveSong = (index: number) => {
    const newItems = editableSongs.filter((_, idx) => idx !== index);
    setEditableSongs(newItems.map((item, idx) => ({ ...item, position: idx + 1 })));
  };

  const handleSaveSetlist = (status: 'draft' | 'published') => {
    if (!activeSetlist) return;
    if (editableSongs.length === 0) {
      showToast('Adicione pelo menos 1 música antes de salvar.', 'error');
      return;
    }

    store.saveSetlist({
      service_id: activeSetlist.service_id,
      responsible_member_id: activeSetlist.responsible_member_id || member.id,
      status,
      songs: editableSongs,
    });

    setIsEditing(false);
    showToast(
      status === 'published'
        ? 'Repertório publicado! A equipe foi notificada.'
        : 'Rascunho de repertório salvo.',
      'success'
    );
  };

  const shareSetlistWhatsApp = (setlist: Setlist) => {
    if (!setlist.service) return;
    const s = setlist.service;
    let text = `🎵 *REPERTÓRIO — ${s.title.toUpperCase()}*\n📅 *Data:* ${s.date} às ${s.start_time}\n\n`;

    setlist.songs?.forEach((item, idx) => {
      text += `${idx + 1}. *${item.song?.title}* — ${item.song?.artist}\n`;
      text += `   Tom: *${item.key_override || item.song?.original_key}*`;
      if (item.bpm_override || item.song?.bpm) {
        text += ` | BPM: ${item.bpm_override || item.song?.bpm}`;
      }
      if (item.notes) {
        text += ` | Obs: ${item.notes}`;
      }
      text += `\n`;
      const yt = item.song?.links?.find((l) => l.platform === 'youtube');
      if (yt) {
        text += `   ▶️ YouTube: ${yt.url}\n`;
      }
      text += `\n`;
    });

    text += `Confira os detalhes e cifras no LOUVOR IENOV!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filter songs for search modal
  const filteredLibrarySongs = store.songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchSongQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchSongQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchSongQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Repertórios de Culto
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            Músicas, tons ajustados, BPM e links oficiais para a equipe ensaiar.
          </p>
        </div>

        {/* Stage Mode Toggle Button (Section 44) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStageMode(!isStageMode)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow-xs ${
              isStageMode
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{isStageMode ? 'Modo Normal' : 'Modo Palco'}</span>
          </button>
        </div>
      </div>

      {/* Services Tabs / Selector for Setlists */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {store.setlists.map((set) => {
          const isSelected = set.id === activeSetlist?.id;
          return (
            <button
              key={set.id}
              onClick={() => {
                setActiveSetlistId(set.id);
                setIsEditing(false);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{set.service?.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                set.status === 'published' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {set.songs?.length || 0}
              </span>
            </button>
          );
        })}
      </div>

      {activeSetlist ? (
        /* Setlist Details or Editor */
        <div className={`rounded-3xl border transition-all ${
          isStageMode
            ? 'bg-black text-white border-amber-500/40 p-6 sm:p-8 shadow-2xl'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm'
        }`}>
          {/* Top Bar of Setlist */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {activeSetlist.service?.date} • {activeSetlist.service?.start_time}
                </span>
                {activeSetlist.status === 'published' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Publicado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Rascunho
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                {activeSetlist.service?.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50 dark:border-amber-700/50">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Ministração: <strong>{ministracaoMember?.profile?.full_name || activeSetlist.responsible_member?.profile?.full_name || 'Liderança'}</strong></span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  (Responsável pelo louvor)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shareSetlistWhatsApp(activeSetlist)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              {!isEditing && canEditCurrentSetlist && (
                <button
                  onClick={() => handleStartEdit(activeSetlist)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{isUserResponsible ? 'Escolher Músicas' : 'Editar Músicas'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Ministração Empowering Banner */}
          {isUserResponsible && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-amber-500/15 border border-amber-400/50 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                  🎤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-amber-200">
                      Você é a Ministração deste Culto!
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      Responsável pelo Louvor
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                    Você tem total autoridade para escolher e organizar as músicas que serão cantadas no culto.
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => handleStartEdit(activeSetlist)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Escolher Músicas</span>
                </button>
              )}
            </div>
          )}

          {/* EDITING MODE: (Sections 27, 28) */}
          {isEditing ? (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Organização das Músicas ({editableSongs.length})
                </h3>
                <button
                  onClick={() => {
                    setSearchSongQuery('');
                    setShowAddSongModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Louvor</span>
                </button>
              </div>

              {/* Added Songs List */}
              <div className="space-y-3">
                {editableSongs.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Nenhuma música no repertório ainda.</p>
                    <button
                      onClick={() => setShowAddSongModal(true)}
                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Pesquisar na Biblioteca
                    </button>
                  </div>
                ) : (
                  editableSongs.map((item, idx) => (
                    <div
                      key={item.song_id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Reorder Buttons (Section 28: Mobile-first ↑ and ↓ buttons) */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-100"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === editableSongs.length - 1}
                              className="p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-100"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0">
                            {idx + 1}
                          </span>

                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {item.song?.title}
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-semibold">
                              {item.song?.artist} • Categoria: {item.song?.category}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSong(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                          title="Remover música"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Overrides: Key, BPM, Notes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Tom para o culto:
                          </label>
                          <input
                            type="text"
                            value={item.key_override}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableSongs(
                                editableSongs.map((s, i) => (i === idx ? { ...s, key_override: val } : s))
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            BPM:
                          </label>
                          <input
                            type="number"
                            value={item.bpm_override || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || undefined;
                              setEditableSongs(
                                editableSongs.map((s, i) => (i === idx ? { ...s, bpm_override: val } : s))
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Observações (arranjo, solo, dinâmica):
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Entrar suave..."
                            value={item.notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableSongs(
                                editableSongs.map((s, i) => (i === idx ? { ...s, notes: val } : s))
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Big Publication & Save Buttons (Section 29) */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => handleSaveSetlist('published')}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>PUBLICAR REPERTÓRIO PARA A EQUIPE</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveSetlist('draft')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Salvar Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE / STAGE MODE (Section 30 & 44) */
            <div className="mt-5 space-y-3">
              {activeSetlist.songs && activeSetlist.songs.length > 0 ? (
                activeSetlist.songs.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition ${
                      isStageMode
                        ? 'bg-slate-900 border-slate-800 hover:border-amber-400/50'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`flex items-center justify-center rounded-2xl font-black text-sm shrink-0 ${
                          isStageMode
                            ? 'h-10 w-10 bg-amber-500 text-slate-950 text-base'
                            : 'h-9 w-9 bg-indigo-600 text-white'
                        }`}>
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <h3 className={`font-extrabold truncate ${
                            isStageMode ? 'text-lg sm:text-xl text-white' : 'text-base text-slate-900 dark:text-white'
                          }`}>
                            {item.song?.title}
                          </h3>
                          <p className={`truncate font-semibold ${
                            isStageMode ? 'text-xs text-amber-200' : 'text-xs text-slate-700 dark:text-slate-300'
                          }`}>
                            {item.song?.artist} • {item.song?.category}
                          </p>
                        </div>
                      </div>

                      {/* Key and BPM badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono font-black rounded-xl px-3 py-1 ${
                          isStageMode
                            ? 'bg-amber-500/20 text-amber-300 text-sm border border-amber-500/40'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs'
                        }`}>
                          {item.key_override || item.song?.original_key}
                        </span>
                        {(item.bpm_override || item.song?.bpm) && (
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.bpm_override || item.song?.bpm} BPM
                          </span>
                        )}
                      </div>
                    </div>

                    {item.notes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-300 font-medium">
                        📌 <strong>Observação:</strong> {item.notes}
                      </div>
                    )}

                    {/* External links */}
                    <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/60 flex flex-wrap items-center gap-2">
                      {item.song?.links?.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                            link.platform === 'youtube'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ouvir no {link.platform === 'youtube' ? 'YouTube' : 'Spotify'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-700 dark:text-slate-300 font-semibold">
                  Nenhuma música cadastrada neste repertório.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Nenhum culto com repertório disponível.</p>
        </div>
      )}

      {/* Add Song Modal (Section 27: Search large input + Cards) */}
      {showAddSongModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-600" />
                <span>Pesquisar Louvor</span>
              </h3>
              <button
                onClick={() => setShowAddSongModal(false)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchSongQuery}
                onChange={(e) => setSearchSongQuery(e.target.value)}
                placeholder="Digite o título, artista ou categoria..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            {/* Results list */}
            <div className="mt-4 space-y-2.5 overflow-y-auto flex-1 pr-1">
              {filteredLibrarySongs.map((song) => (
                <div
                  key={song.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {song.title}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-semibold">
                      {song.artist} • Tom: <span className="font-mono font-bold text-indigo-600">{song.original_key}</span> • {song.bpm ? `${song.bpm} BPM` : 'BPM livre'}
                    </p>
                    {song.last_used_date && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                        ⚠️ Usada recentemente ({song.last_used_date})
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddSongToSetlist(song)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 active:scale-95 transition"
                  >
                    ADICIONAR
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
