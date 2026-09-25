import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { Song } from '../../types/database';
import {
  Disc3,
  Search,
  Plus,
  ExternalLink,
  Edit2,
  X,
  Music2,
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES = ['Todas', 'Adoração', 'Celebração', 'Louvor', 'Ceia', 'Oferta', 'Especial'];
const COMMON_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Am', 'Em', 'Bm', 'F#m', 'C#m'];

export const SongsScreen: React.FC = () => {
  const { isAdmin, isMinister, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [bpm, setBpm] = useState<number | undefined>(72);
  const [category, setCategory] = useState('Adoração');
  const [notes, setNotes] = useState('');
  const [lyricsRef, setLyricsRef] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  const filteredSongs = store.songs.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'Todas' || song.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreate = () => {
    setEditingSong(null);
    setTitle('');
    setArtist('');
    setOriginalKey('G');
    setBpm(72);
    setCategory('Adoração');
    setNotes('');
    setLyricsRef('');
    setYoutubeUrl('');
    setSpotifyUrl('');
    setShowModal(true);
  };

  const handleOpenEdit = (song: Song) => {
    setEditingSong(song);
    setTitle(song.title);
    setArtist(song.artist);
    setOriginalKey(song.original_key);
    setBpm(song.bpm);
    setCategory(song.category);
    setNotes(song.notes || '');
    setLyricsRef(song.lyrics_reference || '');
    setYoutubeUrl(song.links?.find((l) => l.platform === 'youtube')?.url || '');
    setSpotifyUrl(song.links?.find((l) => l.platform === 'spotify')?.url || '');
    setShowModal(true);
  };

  const handleSaveSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      showToast('Preencha título e artista.', 'error');
      return;
    }

    if (editingSong) {
      store.updateSong(editingSong.id, {
        title,
        artist,
        original_key: originalKey,
        bpm,
        category,
        notes,
        lyrics_reference: lyricsRef,
        youtube_url: youtubeUrl,
        spotify_url: spotifyUrl,
      });
      showToast('Louvor atualizado com sucesso!', 'success');
    } else {
      store.addSong({
        title,
        artist,
        original_key: originalKey,
        bpm,
        category,
        notes,
        lyrics_reference: lyricsRef,
        youtube_url: youtubeUrl,
        spotify_url: spotifyUrl,
      });
      showToast('Louvor cadastrado na biblioteca!', 'success');
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Biblioteca de Louvores
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            {store.songs.length} músicas catalogadas com tom original, BPM e links oficiais.
          </p>
        </div>

        {(isAdmin || isMinister) && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-md shadow-indigo-600/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Louvor</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por título, artista ou tema..."
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Songs Cards Grid (Section 36: No horizontal table on mobile!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSongs.map((song) => {
          const yt = song.links?.find((l) => l.platform === 'youtube');
          const sp = song.links?.find((l) => l.platform === 'spotify');

          return (
            <div
              key={song.id}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {song.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 truncate">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">{song.artist}</p>
                  </div>

                  {(isAdmin || isMinister) && (
                    <button
                      onClick={() => handleOpenEdit(song)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tone and BPM badges */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    Tom: {song.original_key}
                  </span>
                  {song.bpm && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {song.bpm} BPM
                    </span>
                  )}
                </div>

                {/* Lyrics snippet */}
                {song.lyrics_reference && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 italic pt-1 font-medium">
                    "{song.lyrics_reference}"
                  </p>
                )}

                {/* Recently used warning alert (Section 37) */}
                {song.last_used_date && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Usada recentemente ({song.last_used_date})</span>
                  </div>
                )}
              </div>

              {/* External Music Links */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center gap-2">
                {yt ? (
                  <a
                    href={yt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold italic">Sem YouTube</span>
                )}

                {sp && (
                  <a
                    href={sp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold transition active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Spotify</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Song Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Music2 className="w-5 h-5 text-indigo-600" />
                <span>{editingSong ? 'Editar Louvor' : 'Cadastrar Novo Louvor'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSong} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título da Música *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: A Casa É Sua"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Artista / Ministério *
                </label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex: Casa Worship, Isaías Saad..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tom Original
                  </label>
                  <select
                    value={originalKey}
                    onChange={(e) => setOriginalKey(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white"
                  >
                    {COMMON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    BPM
                  </label>
                  <input
                    type="number"
                    value={bpm || ''}
                    onChange={(e) => setBpm(parseInt(e.target.value) || undefined)}
                    placeholder="72"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link do YouTube (Oficial ou Referência)
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Link do Spotify
                </label>
                <input
                  type="url"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Letra / Refrão de Referência
                </label>
                <textarea
                  rows={2}
                  value={lyricsRef}
                  onChange={(e) => setLyricsRef(e.target.value)}
                  placeholder="Essa casa é sua casa, nós deixamos ela pra você, Jesus..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  {editingSong ? 'Salvar Alterações' : 'Cadastrar Louvor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
