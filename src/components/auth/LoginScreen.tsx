import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { Music, Lock, User, Eye, EyeOff, ArrowRight, Shield, AlertCircle, HelpCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('Informe seu usuário ou e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha.');
      return;
    }

    setIsSubmitting(true);
    const res = login(username, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
    }
  };

  const handleQuickLogin = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    login(demoUser, demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 shadow-2xl shadow-indigo-600/30 mb-1 mx-auto overflow-hidden">
            <BrandLogo imgClassName="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              LOUVOR <span className="text-indigo-400">IENOV</span>
            </h1>
            <p className="text-xs uppercase tracking-widest font-extrabold text-indigo-300 mt-1">
              Ministério de Louvor IENOV
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-xl font-black text-white">Acesse sua conta</h2>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              Entre com as credenciais fornecidas pelo ministério.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuário */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: joao.silva ou seu@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-400 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-400 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão ENTRAR */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'ENTRANDO...' : 'ENTRAR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Safe Backend Notice */}
          <div className="pt-2 text-center text-[10px] text-slate-300 font-semibold flex items-center justify-center gap-1.5 border-t border-slate-700/50">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Autenticação protegida por criptografia e RLS</span>
          </div>
        </div>

        {/* Demo Fast Account Selector for Testing */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider text-center">
            Acesso Rápido para Testes
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('lider.master', 'M@ster2026')}
              className="p-2 rounded-xl bg-slate-700/60 hover:bg-indigo-600/30 border border-slate-600/50 text-left transition flex items-center justify-between group"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-indigo-300">
                  👑 Conta Master (Líder / Admin)
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  usuário: <strong className="text-indigo-400">lider.master</strong> | senha: M@ster2026
                </p>
              </div>
              <span className="text-[10px] font-black uppercase text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800">
                MASTER_ADMIN
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('joao.silva', 'Louvor@2026')}
              className="p-2 rounded-xl bg-slate-700/60 hover:bg-amber-600/30 border border-slate-600/50 text-left transition flex items-center justify-between group"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-amber-300">
                  🎸 João Silva (1º Acesso - Obriga Troca)
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  usuário: <strong className="text-amber-400">joao.silva</strong> | senha: Louvor@2026
                </p>
              </div>
              <span className="text-[10px] font-black uppercase text-amber-400 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800">
                1º ACESSO
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('davi.batera', 'Membro@2026')}
              className="p-2 rounded-xl bg-slate-700/60 hover:bg-emerald-600/30 border border-slate-600/50 text-left transition flex items-center justify-between group"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white group-hover:text-emerald-300">
                  🥁 Davi Baterista (Membro Ativo)
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  usuário: <strong className="text-emerald-400">davi.batera</strong> | senha: Membro@2026
                </p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800">
                MEMBER
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400">
              <HelpCircle className="w-6 h-6" />
              <h3 className="text-lg font-black text-white">Esqueceu sua senha?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              Conforme as diretrizes de segurança do ministério, os membros não geram senhas soltas por e-mail externo. 
            </p>
            <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-800/60 text-xs text-indigo-200 font-semibold space-y-1">
              <p className="font-bold text-white">Como recuperar:</p>
              <p>1. Peça ao líder principal (MASTER_ADMIN) para redefinir sua senha.</p>
              <p>2. O líder gerará uma nova senha inicial em <strong>Equipe &gt; Redefinir Senha</strong>.</p>
              <p>3. Você receberá a senha temporária e definirá sua nova senha ao entrar.</p>
            </div>
            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition"
            >
              Entendido, voltar ao Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
