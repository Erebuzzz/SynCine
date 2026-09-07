import React, { useState, useEffect, useRef } from 'react';
import {
  SynEmojiId,
  SYN_ALL_EMOJIS,
  SYN_DEFAULT_PRESET_IDS
} from './icons/SynEmojiIcons';
import { Settings2, RotateCcw, X, Sparkles } from 'lucide-react';
import PopupPortal from './PopupPortal';

export interface FloatingReaction {
  id: string;
  emojiId: SynEmojiId;
  xPercent: number;
  senderName?: string;
}

interface EmojiReactionsProps {
  isOpen: boolean;
  onClose: () => void;
  onSendReaction: (emojiId: SynEmojiId) => void;
  activeReactions: FloatingReaction[];
  triggerRef?: React.RefObject<HTMLElement>;
  popupRef?: React.RefObject<HTMLDivElement>;
  popupStyle?: React.CSSProperties;
  caretLeft?: number;
  isFlipped?: boolean;
}

const STORAGE_KEY = 'syncine-emoji-presets';

export const EmojiReactions: React.FC<EmojiReactionsProps> = ({
  isOpen,
  onClose,
  onSendReaction,
  activeReactions,
  triggerRef,
  popupRef,
  popupStyle,
  caretLeft,
  isFlipped
}) => {
  const [presets, setPresets] = useState<SynEmojiId[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === 10) {
            return parsed;
          }
        }
      } catch {}
    }
    return SYN_DEFAULT_PRESET_IDS;
  });

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const internalTrayRef = useRef<HTMLDivElement>(null);
  const effectiveTrayRef = popupRef || internalTrayRef;

  // Close tray when clicking outside
  useEffect(() => {
    if (!isOpen) {
      setIsCustomizing(false);
      setSelectedSlotIndex(null);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTray = effectiveTrayRef.current?.contains(target);
      const inTrigger = triggerRef?.current?.contains(target);
      if (!inTray && !inTrigger) {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, effectiveTrayRef, triggerRef]);

  const handleSelectEmoji = (id: SynEmojiId) => {
    if (isCustomizing && selectedSlotIndex !== null) {
      const nextPresets = [...presets];
      nextPresets[selectedSlotIndex] = id;
      setPresets(nextPresets);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPresets));
      setSelectedSlotIndex(null);
      return;
    }

    onSendReaction(id);
  };

  const handleResetDefaults = () => {
    setPresets(SYN_DEFAULT_PRESET_IDS);
    localStorage.removeItem(STORAGE_KEY);
    setSelectedSlotIndex(null);
  };

  const trayContent = (
    <>
      {/* Header toolbar when customizing */}
      {isCustomizing && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 border-b border-black/[0.06] dark:border-white/[0.06] text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span>Customize 10 Presets</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-[11px] text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white transition cursor-pointer"
              title="Reset to default presets"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomizing(false);
                setSelectedSlotIndex(null);
              }}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-black/55 dark:text-white/55 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Active 10 Emoji Preset Grid */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {presets.map((id, index) => {
          const meta = SYN_ALL_EMOJIS.find((e) => e.id === id) || SYN_ALL_EMOJIS[0];
          const Component = meta.component;
          const isSelectedSlot = selectedSlotIndex === index;

          return (
            <button
              key={`${id}-${index}`}
              type="button"
              onClick={() => {
                if (isCustomizing) {
                  setSelectedSlotIndex(isSelectedSlot ? null : index);
                } else {
                  handleSelectEmoji(id);
                }
              }}
              className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl transition cursor-pointer flex flex-col items-center justify-center shrink-0 min-w-[42px] sm:min-w-[46px] min-h-[42px] sm:min-h-[46px] group relative ${
                isSelectedSlot
                  ? 'bg-[var(--accent)]/20 border-2 border-[var(--accent)] scale-105'
                  : isCustomizing
                  ? 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-dashed border-black/20 dark:border-white/25'
                  : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:scale-125 active:scale-95'
              }`}
              title={isCustomizing ? `Click to swap preset ${index + 1}` : meta.name}
            >
              <Component size={24} className="transition-transform group-hover:scale-110" />
              {isCustomizing && (
                <span className="text-[9px] font-mono text-black/40 dark:text-white/40 mt-0.5">
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}

        {/* Customization Toggle Button */}
        {!isCustomizing && (
          <div className="pl-1 border-l border-black/[0.08] dark:border-white/[0.08] flex items-center">
            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition cursor-pointer"
              title="Customize Preset Emojis"
            >
              <Settings2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Extended Library Drawer when customizing */}
      {isCustomizing && (
        <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          <div className="text-[11px] font-medium text-black/55 dark:text-white/55 mb-2 px-1">
            {selectedSlotIndex !== null
              ? `Select replacement for slot #${selectedSlotIndex + 1}:`
              : 'Click a preset above, then select an icon below:'}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-1.5 max-h-40 overflow-y-auto p-1">
            {SYN_ALL_EMOJIS.map((emoji) => {
              const Component = emoji.component;
              const isAlreadyInPresets = presets.includes(emoji.id);

              return (
                <button
                  key={emoji.id}
                  type="button"
                  disabled={selectedSlotIndex === null}
                  onClick={() => handleSelectEmoji(emoji.id)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isAlreadyInPresets
                      ? 'bg-black/[0.02] dark:bg-white/[0.03]'
                      : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:scale-110'
                  }`}
                  title={emoji.name}
                >
                  <Component size={22} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Floating Animated Reaction Bubbles across the screen */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map((reaction) => {
          const meta = SYN_ALL_EMOJIS.find((e) => e.id === reaction.emojiId);
          if (!meta) return null;
          const Component = meta.component;

          return (
            <div
              key={reaction.id}
              className="absolute bottom-20 animate-floating-reaction flex flex-col items-center pointer-events-none select-none"
              style={{
                left: `${reaction.xPercent}%`,
              }}
            >
              <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-2xl transition-transform hover:scale-110">
                <Component size={32} />
              </div>
              {reaction.senderName && (
                <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-md truncate max-w-[120px] shadow-sm">
                  {reaction.senderName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Reaction Tray Popover */}
      {isOpen && popupStyle ? (
        <PopupPortal
          ref={effectiveTrayRef}
          isOpen={isOpen}
          style={popupStyle}
          caretLeft={caretLeft}
          isFlipped={isFlipped}
          widthClass="w-auto max-w-[calc(100vw-32px)]"
          className="p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl"
          bgClass="bg-white/80 dark:bg-[#121216]/80"
          borderClass="border-black/[0.08] dark:border-white/15"
          textClass="text-[#1D1D1F] dark:text-[#F5F5F7]"
          caretClass={
            isFlipped
              ? 'border-b-white/90 dark:border-b-[#121216]/90'
              : 'border-t-white/90 dark:border-t-[#121216]/90'
          }
        >
          {trayContent}
        </PopupPortal>
      ) : isOpen ? (
        <div
          ref={effectiveTrayRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-auto max-w-[calc(100vw-32px)] p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl realistic-glass bg-white/80 dark:bg-[#121216]/80 backdrop-blur-2xl border border-black/[0.08] dark:border-white/15 shadow-2xl animate-enter-smooth select-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-solid after:border-[6px] after:border-transparent after:border-t-white/90 dark:after:border-t-[#121216]/90 after:pointer-events-none"
        >
          {trayContent}
        </div>
      ) : null}
    </>
  );
};
