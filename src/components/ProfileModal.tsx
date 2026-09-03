import React, { useState, useRef } from 'react';
import type { Models } from 'appwrite';
import { account } from '../lib/appwrite';
import {
  User,
  Camera,
  Upload,
  Check,
  X,
  Shield,
  Trash2
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Models.User<Models.Preferences> | null;
  userName: string;
  onSaveName: (name: string) => void;
  avatarUrl?: string;
  onSaveAvatar: (url: string) => void;
  onOpenAuth?: () => void;
}

const CINEMA_PRESET_AVATARS = [
  { id: 'director', name: 'Director', emoji: '🎬', bg: 'from-amber-600 to-amber-900' },
  { id: 'camera', name: 'Cinematographer', emoji: '🎥', bg: 'from-blue-600 to-indigo-900' },
  { id: 'popcorn', name: 'Film Buff', emoji: '🍿', bg: 'from-red-600 to-rose-900' },
  { id: 'star', name: 'Lead Actor', emoji: '⭐', bg: 'from-yellow-500 to-amber-800' },
  { id: 'crown', name: 'Producer', emoji: '👑', bg: 'from-purple-600 to-violet-900' },
  { id: 'reel', name: 'Archivist', emoji: '🎞️', bg: 'from-emerald-600 to-teal-900' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userName,
  onSaveName,
  avatarUrl = '',
  onSaveAvatar,
  onOpenAuth
}) => {
  const [name, setName] = useState(userName);
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const isAuthenticated = Boolean(currentUser?.email && currentUser.email.length > 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedbackMessage('Please select an image file (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFeedbackMessage('Image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCurrentAvatar(reader.result);
        setFeedbackMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof CINEMA_PRESET_AVATARS[0]) => {
    // Generate an SVG data URI for the cinema avatar preset
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#C8A97E"/>
          <stop offset="100%" stop-color="#1A1A1D"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#g)"/>
      <text x="50" y="58" font-size="44" text-anchor="middle" dominant-baseline="central">${preset.emoji}</text>
    </svg>`;
    const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    setCurrentAvatar(uri);
  };

  const handleRemoveAvatar = () => {
    setCurrentAvatar('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      if (isAuthenticated && account) {
        await account.updateName(cleanName).catch(console.warn);
        try {
          await account.updatePrefs({ avatar: currentAvatar });
        } catch {}
      }

      onSaveName(cleanName);
      onSaveAvatar(currentAvatar);
      localStorage.setItem('syncine-user-name', cleanName);
      localStorage.setItem('syncine-user-avatar', currentAvatar);

      setFeedbackMessage('Profile updated successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setFeedbackMessage(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-enter-smooth select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                Your Profile
              </h3>
              <p className="text-[11px] text-black/55 dark:text-white/55">
                Customize your display name and cinema avatar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-black/55 dark:text-white/55 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--accent)] bg-black/[0.04] dark:bg-white/[0.06] shadow-xl flex items-center justify-center">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--accent)] bg-[var(--accent)]/10">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                title="Change Photo"
              >
                <Camera size={20} />
                <span className="text-[10px] font-semibold mt-1">Upload</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Avatar Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.06] dark:border-white/[0.08] transition cursor-pointer"
              >
                <Upload size={13} />
                <span>Upload Photo</span>
              </button>

              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="p-2 rounded-xl text-[#FF453A] hover:bg-[#FF453A]/10 transition cursor-pointer"
                  title="Remove Avatar"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Cinema Presets */}
            <div className="w-full mt-4">
              <div className="text-[11px] font-semibold text-black/55 dark:text-white/55 mb-2 text-center">
                Or pick a Cinema Avatar Preset:
              </div>
              <div className="grid grid-cols-6 gap-2">
                {CINEMA_PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] hover:scale-110 transition cursor-pointer text-xl flex items-center justify-center shadow-xs"
                    title={preset.name}
                  >
                    {preset.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Christopher, Stanley, Greta"
              maxLength={32}
              required
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-3 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition"
            />
            <span className="text-[10px] text-black/45 dark:text-white/45 mt-1 block">
              Shown on your camera tile, watchroom roster, and reaction bubbles
            </span>
          </div>

          {/* Account Status Card */}
          <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg ${isAuthenticated ? 'bg-[#30D158]/15 text-[#30D158]' : 'bg-black/[0.06] dark:bg-white/[0.08] text-black/60 dark:text-white/60'}`}>
                <Shield size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  {isAuthenticated ? currentUser?.email : 'Guest Session'}
                </div>
                <div className="text-[10px] text-black/45 dark:text-white/45">
                  {isAuthenticated ? 'Authenticated Host Account' : 'Permanent links require host sign-in'}
                </div>
              </div>
            </div>

            {!isAuthenticated && onOpenAuth && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-black text-[11px] font-bold hover:opacity-90 transition cursor-pointer shrink-0"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Feedback message */}
          {feedbackMessage && (
            <div className={`p-2.5 rounded-xl text-xs font-medium text-center ${
              feedbackMessage.includes('successfully')
                ? 'bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20'
                : 'bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20'
            }`}>
              {feedbackMessage}
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-black text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={15} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
