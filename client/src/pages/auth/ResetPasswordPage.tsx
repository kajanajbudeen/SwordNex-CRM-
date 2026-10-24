import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../api/client';
import { PasswordInput } from '../../components/common/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password recovery token. Please request a new reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('A valid recovery token is required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.message || 'Password reset failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Password reset request failed. The token may be expired or already used.');
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a cryptographically strong, unique password for your account.
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8 border border-slate-800 shadow-2xl">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-100">Password Reset Successful</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your password has been securely updated and all previous active sessions have been revoked.
                Please log in with your new credentials.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
                  <PasswordInput
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Password Security Guidelines:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                    <li>Minimum 8 characters (12+ recommended)</li>
                    <li>Avoid reusing previous passwords or breached dictionary phrases</li>
                    <li>Combine uppercase, lowercase, numbers, and symbols</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Securing Account...' : 'Update Password & Revoke Sessions'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 transition">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
