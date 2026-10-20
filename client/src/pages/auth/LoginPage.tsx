import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@swordnex.com');
  const [password, setPassword] = useState('SwordNex2026!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C16] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-glow-cyan mb-4 text-white font-black text-2xl">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SwordNex AI CRM</h1>
          <p className="text-sm text-cyan-400 font-medium mt-1">
            Understand Customers. Predict Opportunities. Accelerate Growth.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-1">Sign in to workspace</h2>
          <p className="text-xs text-slate-400 mb-6">Enter your credentials to access your tenant CRM console.</p>

          {error && (
            <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to CRM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Seed Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-xs">
            <p className="text-[11px] font-mono text-cyan-400 mb-2 font-semibold">PRELOADED SEED CREDENTIALS:</p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@swordnex.com');
                  setPassword('SwordNex2026!');
                }}
                className="w-full text-left p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-between transition"
              >
                <span>admin@swordnex.com (SUPER_ADMIN: Kaja Najbudeen)</span>
                <span className="text-cyan-400 font-sans text-xs">Autofill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('aneee@swordnex.com');
                  setPassword('SwordNex2026!');
                }}
                className="w-full text-left p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-between transition"
              >
                <span>aneee@swordnex.com (ADMIN: Aneee)</span>
                <span className="text-cyan-400 font-sans text-xs">Autofill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('venkat@swordnex.com');
                  setPassword('SwordNex2026!');
                }}
                className="w-full text-left p-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-between transition"
              >
                <span>venkat@swordnex.com (USER: Venkat)</span>
                <span className="text-cyan-400 font-sans text-xs">Autofill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Need a new workspace?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline font-semibold">
            Create organization
          </Link>
        </p>
      </div>
    </div>
  );
};
