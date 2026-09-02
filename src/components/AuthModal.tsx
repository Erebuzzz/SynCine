import React, { useState } from 'react';
import { loginWithEmail, registerWithEmail } from '../lib/appwrite';
import { SynLogo } from './icons/SynIcons';
import { LiquidGlassCard } from './LiquidGlassCard';
import { X, Lock, Mail, User, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Models } from 'appwrite';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: Models.User<Models.Preferences>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) return;
    if (isSignUp && !name) return;

    setIsLoading(true);
    try {
      let user: Models.User<Models.Preferences>;
      if (isSignUp) {
        user = await registerWithEmail(email.trim(), password, name.trim());
      } else {
        user = await loginWithEmail(email.trim(), password);
      }
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-lg">
      <div className="relative w-full max-w-md">
        <LiquidGlassCard variant="modal" className="p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <SynLogo size={40} className="mb-3" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {isSignUp ? 'Create Host Account' : 'Sign In to SynCine'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
              Unlock Permanent Watchrooms that never expire. Guest rooms automatically reset after 3 hours.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="ml-2 font-semibold opacity-60 hover:opacity-100"
              >
                &times;
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  Your Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Christopher Nolan"
                    className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl pl-11 pr-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl pl-11 pr-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-xs rounded-xl pl-11 pr-4 py-3.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password || (isSignUp && !name)}
              className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-black font-semibold text-xs rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : isSignUp ? 'Create Host Account' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer transition"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
            <ShieldCheck size={14} className="text-[var(--success)]" />
            <span>Zero telemetry. No invasive tracking.</span>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};
