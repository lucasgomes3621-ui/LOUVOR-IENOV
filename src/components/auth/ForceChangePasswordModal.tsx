import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export const ForceChangePasswordModal: React.FC = () => {
  const { user, changePassword, setActiveTab } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setIsSubmitting(true);
    const res = changePassword(newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setActiveTab('dashboard');
    } else {
      setError(res.message || 'Erro ao alterar a senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center mb-2 shadow-md">
            <BrandLogo imgClassName="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Bem-vindo ao LOUVOR IENOV
          </h2>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-semibold max-w-xs mx-auto">
            Olá, <strong className="text-slate-900 dark:text-white">{user.full_name}</strong>. Para proteger sua conta e garantir sua privacidade, defina uma nova senha pessoal para seus próximos acessos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nova senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Confirmar nova senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-semibold space-y-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword.length >= 6 ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>No mínimo 6 caracteres</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>As senhas coincidem</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/25 active:scale-98 transition disabled:opacity-50"
          >
            {isSubmitting ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
          </button>
        </form>
      </div>
    </div>
  );
};
