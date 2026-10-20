import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MasterLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { masterLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await masterLogin(email, password);
      if (data) {
        navigate('/swordnex-master/dashboard');
      } else {
        setError('Master login failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(
        err.message ||
        'Access denied. This portal is strictly restricted to SwordNex Master Platform Administrators.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060810] flex items-center justify-center p-4 relative overflow-hidden selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background Futuristic Ambient Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Master Portal Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>SWORDNEX HEAD OFFICE • MASTER PLATFORM</span>
          </div>

          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-2xl border border-purple-400/30">
              S
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>SwordNex</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  MASTER
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">Platform Administrator Portal</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-2">
            Super Admin access for global company oversight, SaaS subscription enforcement, and platform analytics.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-purple-200/90 leading-relaxed font-mono">
            Authorized SwordNex administrative personnel only. Customer accounts must use the standard company login.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-purple-500/20 shadow-2xl bg-slate-900/60 backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Master Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@swordnex.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all duration-300 shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate Master Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">Demo Master Admin:</span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@swordnex.com');
                setPassword('SwordNex2026!');
              }}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-mono underline"
            >
              Fill Credentials
            </button>
          </div>
        </div>

        {/* Customer Org Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-400 hover:text-slate-200 transition font-mono flex items-center justify-center space-x-1.5 mx-auto"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Switch to Customer Organization Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
