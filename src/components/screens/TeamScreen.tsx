import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { MinistryMember, UserRole } from '../../types/database';
import { NewMemberModal } from '../team/NewMemberModal';
import {
  Users,
  UserPlus,
  Share2,
  Shield,
  Edit2,
  Phone,
  Mail,
  X,
  UserCheck,
  UserX,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Music,
  User
} from 'lucide-react';

export const TeamScreen: React.FC = () => {
  const { isMasterAdmin, showToast, openNewMemberModal, setOpenNewMemberModal } = useApp();

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit member modal
  const [editingMember, setEditingMember] = useState<MinistryMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Deactivation confirmation modal (Section 11)
  const [deactivatingMember, setDeactivatingMember] = useState<MinistryMember | null>(null);

  // Password reset confirmation & result modal (Section 10)
  const [resetPromptMember, setResetPromptMember] = useState<MinistryMember | null>(null);
  const [generatedPasswordModal, setGeneratedPasswordModal] = useState<{
    memberName: string;
    username: string;
    tempPassword: string;
  } | null>(null);

  const inviteLink = `${window.location.origin}/convite?ministry=${store.ministry.id}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    showToast('Link de convite copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareInviteWhatsApp = () => {
    const text = `🙌 Olá! Você foi convidado para fazer parte da equipe de louvor *${store.ministry.name}* (${store.ministry.church_name}) no aplicativo *LOUVOR IENOV*!\n\nAcesse o link para entrar na equipe:\n${inviteLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Open edit modal
  const handleOpenEdit = (m: MinistryMember) => {
    setEditingMember(m);
    setEditName(m.profile?.full_name || '');
    setEditPhone(m.profile?.phone || '');
    setSelectedRoleIds(m.roles?.map((r) => r.id) || []);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!editName.trim()) {
      showToast('O nome não pode estar em branco.', 'error');
      return;
    }

    // Update profile
    store.updateProfile({
      full_name: editName.trim(),
      phone: editPhone.trim(),
    });

    // Update roles
    store.updateMember(editingMember.id, {
      roleIds: selectedRoleIds,
    });

    showToast(`Dados de ${editName} atualizados com sucesso!`, 'success');
    setEditingMember(null);
  };

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  // Execute Deactivation (Section 11)
  const handleConfirmDeactivation = () => {
    if (!deactivatingMember) return;
    const res = store.deactivateMember(deactivatingMember.id);
    if (res.success) {
      showToast(`${deactivatingMember.profile?.full_name} foi desativado. O histórico foi preservado.`, 'info');
    } else {
      showToast(res.message || 'Erro ao desativar membro.', 'error');
    }
    setDeactivatingMember(null);
  };

  const handleReactivate = (m: MinistryMember) => {
    const res = store.reactivateMember(m.id);
    if (res.success) {
      showToast(`${m.profile?.full_name} foi reativado com sucesso!`, 'success');
    } else {
      showToast(res.message || 'Erro ao reativar membro.', 'error');
    }
  };

  // Execute Reset Password (Section 10)
  const handleConfirmResetPassword = () => {
    if (!resetPromptMember) return;
    const res = store.resetMemberPassword(resetPromptMember.id);
    if (res.success && res.temporaryPassword) {
      setGeneratedPasswordModal({
        memberName: resetPromptMember.profile?.full_name || 'Membro',
        username: resetPromptMember.profile?.username || 'membro',
        tempPassword: res.temporaryPassword,
      });
      showToast('Nova senha temporária gerada com sucesso!', 'success');
    } else {
      showToast(res.message || 'Erro ao redefinir senha.', 'error');
    }
    setResetPromptMember(null);
  };

  const handleCopyTempPassword = () => {
    if (!generatedPasswordModal) return;
    const text = `🔐 Olá ${generatedPasswordModal.memberName}! Sua senha do LOUVOR IENOV foi redefinida pelo líder.\n\n📱 Seus novos dados:\nUsuário: ${generatedPasswordModal.username}\nSenha Temporária: ${generatedPasswordModal.tempPassword}\n\n*Ao fazer login, o aplicativo solicitará que você cadastre sua nova senha pessoal.*`;
    navigator.clipboard.writeText(text);
    showToast('Dados e senha temporária copiados!', 'success');
  };

  const handleShareTempPasswordWhatsApp = () => {
    if (!generatedPasswordModal) return;
    const text = encodeURIComponent(
      `🔐 Olá ${generatedPasswordModal.memberName}! Sua senha no *LOUVOR IENOV* foi redefinida pelo líder.\n\nUsuário: *${generatedPasswordModal.username}*\nSenha Temporária: *${generatedPasswordModal.tempPassword}*\n\n🔒 No seu próximo login, defina sua nova senha definitiva.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Equipe do Ministério</span>
            {isMasterAdmin && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold text-[10px]">
                ADMINISTRAÇÃO MASTER
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold">
            {store.members.length} integrantes cadastrados • Gerencie usuários, instrumentos e acessos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl transition active:scale-95"
          >
            <Share2 className="w-4 h-4 text-emerald-500" />
            <span>Convite WhatsApp</span>
          </button>

          {isMasterAdmin && (
            <button
              onClick={() => setOpenNewMemberModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-95 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ NOVO MEMBRO</span>
            </button>
          )}
        </div>
      </div>

      {/* Members Cards Grid (Section 9 & 16: Cards mobile-first) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {store.members.map((m) => {
          const isMaster = m.role === 'MASTER_ADMIN' || m.role === 'admin';
          const primaryInstrument = m.roles?.[0]?.name || 'Ministério de Louvor';

          return (
            <div
              key={m.id}
              className={`rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-xs transition flex flex-col justify-between ${
                m.active
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-70'
              }`}
            >
              <div className="space-y-3">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        m.profile?.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                      }
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                        {m.profile?.full_name}
                      </h3>
                      {/* Instrumento */}
                      <p className={`text-xs font-bold flex items-center gap-1 truncate ${
                        primaryInstrument === 'Ministração' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <span>{primaryInstrument === 'Ministração' ? '🎤' : '🎸'}</span>
                        <span>{primaryInstrument}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {m.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Desativado
                      </span>
                    )}
                  </div>
                </div>

                {/* Usuário de Login & Role Badge */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">Usuário de login:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      @{m.profile?.username || 'membro'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">Nível de acesso:</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isMaster
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {isMaster ? '👑 MASTER_ADMIN' : '🔘 MEMBER'}
                    </span>
                  </div>
                </div>

                {/* Informações adicionais */}
                {m.profile?.phone && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.profile.phone}</span>
                  </p>
                )}

                {/* Funções Secundárias */}
                {m.roles && m.roles.length > 1 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {m.roles.slice(1).map((r) => {
                      const isMin = r.name.toLowerCase().includes('ministra');
                      return (
                        <span
                          key={r.id}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isMin
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isMin ? '🎤 Ministração' : `+${r.name}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ações do MASTER_ADMIN (Section 9: Editar, Desativar, Redefinir senha) */}
              {isMasterAdmin && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Botão Editar */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Editar</span>
                    </button>

                    {/* Botão Desativar / Reativar (Section 11) */}
                    {m.active ? (
                      <button
                        type="button"
                        disabled={isMaster}
                        onClick={() => setDeactivatingMember(m)}
                        className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={isMaster ? 'Conta Master não pode ser desativada' : 'Desativar membro'}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Desativar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(m)}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Reativar</span>
                      </button>
                    )}
                  </div>

                  {/* Botão Redefinir senha (Section 10) */}
                  <button
                    type="button"
                    onClick={() => setResetPromptMember(m)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition active:scale-95"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                    <span>Redefinir Senha</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Redefinição de Senha - Diálogo de Confirmação (Section 10) */}
      {resetPromptMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Redefinir Senha do Membro
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Deseja gerar uma nova senha inicial para{' '}
                <strong className="text-slate-900 dark:text-white">
                  {resetPromptMember.profile?.full_name}
                </strong>
                ?
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 font-semibold space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Regra de Segurança:</span>
              </p>
              <p>• O sistema gerará uma senha temporária segura.</p>
              <p>• O membro será obrigado a definir uma nova senha no seu próximo login.</p>
              <p>• A ação será registrada no histórico de atividades.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPromptMember(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
              >
                Gerar Nova Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Senha Temporária Gerada (Section 10: Nunca mostrar a senha novamente depois) */}
      {generatedPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Nova Senha Temporária
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Anote ou envie agora para o membro. Por segurança, esta senha não será exibida novamente.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-center">
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                Usuário: <span className="text-indigo-600 dark:text-indigo-400">{generatedPasswordModal.username}</span>
              </p>
              <div className="py-2 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-lg font-mono font-black text-amber-500 tracking-wider">
                {generatedPasswordModal.tempPassword}
              </div>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                🔒 O membro deverá alterá-la obrigatoriamente ao entrar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyTempPassword}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Copy className="w-4 h-4 text-indigo-500" />
                <span>Copiar</span>
              </button>
              <button
                type="button"
                onClick={handleShareTempPasswordWhatsApp}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGeneratedPasswordModal(null)}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
            >
              Fechar e Concluir
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Desativação (Section 11) */}
      {deactivatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Desativar Membro da Equipe
              </h3>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {deactivatingMember.profile?.full_name}
              </p>
            </div>

            {/* Mensagem exata exigida na Section 11 */}
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 font-semibold space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Atenção:</span>
              </p>
              <p className="leading-relaxed">
                Desativar este membro impedirá seu acesso ao aplicativo, mas seu histórico será preservado.
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                • Ele não poderá fazer login com usuário e senha.
                <br />• Suas escalas passadas e participações em repertórios continuarão salvas.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingMember(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivation}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition"
              >
                Confirmar Desativação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edição de Membro */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Editar {editingMember.profile?.full_name}
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Instrumentos e Funções
                </label>
                <div className="flex flex-wrap gap-2">
                  {store.roles.map((r) => {
                    const isSelected = selectedRoleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRoleSelection(r.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Convite Geral */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <span>Convidar via WhatsApp</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Envie uma mensagem aos integrantes da igreja com o link direto para o aplicativo:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                {inviteLink}
              </span>
              <button
                onClick={handleCopyInviteLink}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition shrink-0"
                title="Copiar link"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleShareInviteWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Abrir WhatsApp com Mensagem</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Novo Membro (Section 3) */}
      <NewMemberModal
        isOpen={openNewMemberModal}
        onClose={() => setOpenNewMemberModal(false)}
      />
    </div>
  );
};
