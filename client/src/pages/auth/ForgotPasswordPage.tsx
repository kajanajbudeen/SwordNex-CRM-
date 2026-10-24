import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { apiClient } from '../../api/client';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch password recovery email.');
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
          <div className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white/5 border border-slate-700/60 shadow-glow-cyan mb-4 backdrop-blur-sm">
            <img
              src="/menu-logo-dark.png"
              alt="SwordNex Technologies"
              className="h-9 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/menu-logo.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Recover Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your registered business email to receive secure recovery instructions.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-100">Recovery Instructions Dispatched</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an account with <span className="text-cyan-400 font-mono">{email}</span> exists, a single-use,
                cryptographically signed password reset link has been dispatched.
              </p>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2 text-left">
                <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  For security, the reset link expires in <strong>1 hour</strong>. If you do not see it in your inbox,
                  check your spam or junk folder.
                </span>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center space-x-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Dispatching Link...' : 'Send Password Reset Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
