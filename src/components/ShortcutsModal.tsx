import React from 'react';
import { Command, X, Mic, Video, Smile, Settings, Maximize, FlipHorizontal, MessageSquare, Pin, Shield, Copy } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  description: string;
  category: 'audio-video' | 'stage' | 'interaction';
  icon: React.ReactNode;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'M', description: 'Mute / Unmute Microphone', category: 'audio-video', icon: <Mic size={14} /> },
  { key: 'Space', description: 'Push-to-Talk (Hold to speak, release to mute)', category: 'audio-video', icon: <Mic size={14} /> },
  { key: 'O', description: 'Camera On / Off', category: 'audio-video', icon: <Video size={14} /> },
  { key: '\\', description: 'Toggle Camera Mirror Mode', category: 'audio-video', icon: <FlipHorizontal size={14} /> },

  { key: 'F', description: 'Toggle Full Screen Mode', category: 'stage', icon: <Maximize size={14} /> },
  { key: 'Esc', description: 'Exit Full Screen / Close Active Modals', category: 'stage', icon: <Command size={14} /> },
  { key: 'P', description: 'Pin / Unpin Focused Video Feed', category: 'stage', icon: <Pin size={14} /> },
  { key: 'S', description: 'Open Settings Menu & Diagnostics', category: 'stage', icon: <Settings size={14} /> },

  { key: 'R', description: 'Open Reactions Emoji Tray', category: 'interaction', icon: <Smile size={14} /> },
  { key: 'C', description: 'Toggle Chat Sidebar', category: 'interaction', icon: <MessageSquare size={14} /> },
  { key: 'H', description: 'Open Host Controls Panel (Host Only)', category: 'interaction', icon: <Shield size={14} /> },
  { key: 'I', description: 'Copy Watchroom Invite Link', category: 'interaction', icon: <Copy size={14} /> },
  { key: '?', description: 'Show Keyboard Shortcuts Cheatsheet', category: 'interaction', icon: <Command size={14} /> },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-[#1D1D1F] dark:text-[#F5F5F7] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Command size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">Keyboard Shortcuts</h3>
            <p className="text-xs text-black/60 dark:text-white/60">Quick hotkeys for seamless cinema control</p>
          </div>
        </div>

        {/* Shortcuts Table */}
        <div className="space-y-2 mb-4">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]"
            >
              <div className="flex items-center gap-2.5 text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">
                <span className="text-black/50 dark:text-white/50">{s.icon}</span>
                <span>{s.description}</span>
              </div>
              <kbd className="px-2.5 py-1 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] border border-black/10 dark:border-white/10 font-mono text-xs font-bold text-[var(--accent)] shrink-0 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="text-[11px] text-black/45 dark:text-white/45 text-center">
          Shortcuts are automatically paused while typing in the chat input or text fields.
        </div>
      </div>
    </div>
  );
};
