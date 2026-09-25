import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { store } from '../../services/store';
import { generateTemporaryPassword } from '../../utils/crypto';
import {
  X,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  Copy,
  Share2,
  RefreshCw,
  Phone,
  Lock,
  User,
  Music
} from 'lucide-react';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({ isOpen, onClose }) => {
  const { isMasterAdmin, showToast } = useApp();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [initialPassword, setInitialPassword] = useState('Louvor@2026');
  const [phone, setPhone] = useState('');
  const [primaryRoleId, setPrimaryRoleId] = useState(store.roles[0]?.id || '');
  const [otherRoleIds, setOtherRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success summary screen state
  const [createdSummary, setCreatedSummary] = useState<{
    fullName: string;
    username: string;
    initialPassword: string;
    phone?: string;
  } | null>(null);

  if (!isOpen) return null;

  // Auto-generate username from full name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFullName(name);
    if (!username || username === fullName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')) {
      const generated = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
      setUsername(generated);
    }
  };

  const handleGeneratePassword = () => {
    setInitialPassword(generateTemporaryPassword());
  };

  const toggleOtherRole = (roleId: string) => {
    setOtherRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMasterAdmin) {
      showToast('Apenas o MASTER_ADMIN possui autorização para criar membros.', 'error');
      return;
    }

    if (!fullName.trim()) {
      showToast('Preencha o nome completo do membro.', 'error');
      return;
    }

    if (!username.trim()) {
      showToast('Defina um nome de usuário.', 'error');
      return;
    }

    if (!initialPassword || initialPassword.length < 6) {
      showToast('A senha inicial deve possuir no mínimo 6 caracteres.', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = store.createMemberByMaster({
      fullName,
      username,
      initialPassword,
      phone,
      primaryRoleId,
      otherRoleIds,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Membro ${fullName} cadastrado com sucesso!`, 'success');
      setCreatedSummary({
        fullName,
        username,
        initialPassword,
        phone,
      });
    } else {
      showToast(res.message || 'Erro ao cadastrar membro.', 'error');
    }
  };

  const handleCopyCredentials = () => {
    if (!createdSummary) return;
    const appUrl = window.location.origin;
    const text = `🙌 Olá ${createdSummary.fullName}! Você foi cadastrado no ministério de louvor pelo LOUVOR IENOV.\n\n🔗 Link de acesso: ${appUrl}\n👤 Usuário: ${createdSummary.username}\n🔑 Senha Inicial: ${createdSummary.initialPassword}\n\n🔒 *No seu primeiro acesso, o aplicativo solicitará que você crie sua própria senha pessoal definitiva.*`;
    navigator.clipboard.writeText(text);
    showToast('Dados de acesso e link copiados com sucesso!', 'success');
  };

  const handleShareWhatsApp = () => {
    if (!createdSummary) return;
    const appUrl = window.location.origin;
    const text = encodeURIComponent(
      `🙌 Olá ${createdSummary.fullName}! Você foi adicionado à equipe de louvor pelo *LOUVOR IENOV*.\n\n🔗 *Link do app:* ${appUrl}\n👤 *Usuário:* ${createdSummary.username}\n🔑 *Senha Inicial:* ${createdSummary.initialPassword}\n\n🔒 *No primeiro acesso, você cadastrará sua senha pessoal definitiva.*`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleFinish = () => {
    setCreatedSummary(null);
    setFullName('');
    setUsername('');
    setPhone('');
    setInitialPassword('Louvor@2026');
    setOtherRoleIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {createdSummary ? 'Conta Criada com Sucesso' : 'Cadastrar Novo Membro'}
              </h2>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Painel do Master Admin • LOUVOR IENOV
              </p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State 1: Creation Success Summary */}
        {createdSummary ? (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                Conta criada com sucesso!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                Envie os dados de primeiro acesso abaixo para o integrante da equipe.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Nome:</span>
                <span className="font-bold text-slate-900 dark:text-white">{createdSummary.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Usuário:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{createdSummary.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">Senha Inicial:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  {createdSummary.initialPassword}
                </span>
              </div>
              <p className="text-[11px] font-sans text-slate-700 dark:text-slate-300 font-semibold pt-1">
                🔒 No primeiro login, o sistema solicitará <strong>obrigatoriamente</strong> que o membro altere para sua senha pessoal definitiva.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-4 h-4 text-indigo-500" />
                <span>Copiar Acesso</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
            >
              Concluir e Voltar para Equipe
            </button>
          </div>
        ) : (
          /* State 2: Creation Form (Section 3 of User Prompt) */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome completo */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nome completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={handleNameChange}
                  placeholder="Ex: João da Silva"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Usuário */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Usuário (Username de login) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="Ex: joao.silva"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Senha inicial */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Senha inicial *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gerar aleatória</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder="Ex: Louvor@2026"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                Será usada somente no 1º acesso. O membro será obrigado a alterá-la logo após o login.
              </p>
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Função principal */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Função principal *
              </label>
              <select
                value={primaryRoleId}
                onChange={(e) => setPrimaryRoleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {store.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name === 'Ministração' ? '🎤 Ministração (Resp. pelo Louvor)' : `${r.name} (${r.category})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Outras funções */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Outras funções secundárias
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {store.roles
                  .filter((r) => r.id !== primaryRoleId)
                  .map((r) => {
                    const isSelected = otherRoleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleOtherRole(r.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
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

            {/* Tipo de acesso (Section 3: Mostrar 🔘 Membro, não permitir que crie outra conta MASTER) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Tipo de acesso
              </label>
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full border-4 border-indigo-600 bg-white" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      🔘 Membro (MEMBER)
                    </span>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold">
                      Acesso individual às escalas, disponibilidade e repertório.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                  Padrão
                </span>
              </div>
              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Por segurança, novos membros comuns não recebem acesso MASTER_ADMIN.</span>
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/25 active:scale-98 transition disabled:opacity-50"
              >
                {isSubmitting ? 'CRIANDO MEMBRO...' : 'CRIAR MEMBRO'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
