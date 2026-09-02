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
    setIsLoading(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="relative w-full max-w-md">
        <LiquidGlassCard variant="modal" className="p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <SynLogo size={40} className="mb-3 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            <h2 className="text-2xl font-black text-white tracking-tight">
              {isSignUp ? 'Create Host Account' : 'Sign In to SynCine'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Unlock Permanent Watchrooms that never expire. Guest rooms automatically reset after 3 hours.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-200 ml-2 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                  Your Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Christopher Nolan"
                    className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-xs rounded-2xl pl-11 pr-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-xs rounded-2xl pl-11 pr-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-xs rounded-2xl pl-11 pr-4 py-3.5 border border-white/10 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password || (isSignUp && !name)}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : isSignUp ? 'Create Host Account' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
              className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Zero telemetry &middot; No invasive tracking</span>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
};
