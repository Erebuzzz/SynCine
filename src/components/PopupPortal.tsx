import { forwardRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopupPortalProps {
  /** Whether the popup is currently visible */
  isOpen: boolean;
  /** Inline style from useAnchoredPopup (position: fixed + coordinates) */
  style: React.CSSProperties;
  /** Horizontal offset for the caret arrow in px */
  caretLeft?: number;
  /** Whether popup flipped below trigger */
  isFlipped?: boolean;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Width class override (default: 'w-64') */
  widthClass?: string;
  /** Background styling class (default: 'bg-white/25 dark:bg-black/30') */
  bgClass?: string;
  /** Border styling class (default: 'border-black/10 dark:border-white/15') */
  borderClass?: string;
  /** Text styling class (default: 'text-[#111113] dark:text-[#F7F7F8]') */
  textClass?: string;
  /** Caret border color class */
  caretClass?: string;
  /** Stop click propagation inside the popup */
  stopPropagation?: boolean;
  children: ReactNode;
}

/**
 * Renders popup content into document.body via a React portal with ultra-translucent liquid glass styling.
 * This escapes all parent stacking context, overflow:hidden, and
 * transform issues that break CSS absolute positioning.
 */
const PopupPortal = forwardRef<HTMLDivElement, PopupPortalProps>(
  (
    {
      isOpen,
      style,
      caretLeft = 0,
      isFlipped = false,
      className = '',
      widthClass = 'w-64',
      bgClass = 'bg-white/25 dark:bg-black/30',
      borderClass = 'border-black/10 dark:border-white/15',
      textClass = 'text-[#111113] dark:text-[#F7F7F8]',
      caretClass,
      stopPropagation = true,
      children,
    },
    ref
  ) => {
    if (!isOpen) return null;

    const defaultCaretClass = isFlipped
      ? 'border-b-white/35 dark:border-b-black/40'
      : 'border-t-white/35 dark:border-t-black/40';

    const popup = (
      <div
        ref={ref}
        style={style}
        className={`${widthClass} p-2 rounded-2xl ${bgClass} backdrop-blur-xl border ${borderClass} shadow-[0_16px_40px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.2)] animate-enter-smooth select-none ${textClass} ${className}`}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {/* Specular Edge Highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/35 dark:via-white/15 to-transparent pointer-events-none z-10" />

        {/* Content layer */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Caret arrow pointing toward the trigger */}
        <div
          className={`absolute pointer-events-none z-10 ${isFlipped ? 'bottom-full' : 'top-full'}`}
          style={{ left: caretLeft }}
        >
          <div
            className={`w-0 h-0 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
              isFlipped ? 'border-b-[6px]' : 'border-t-[6px]'
            } ${caretClass || defaultCaretClass}`}
          />
        </div>
      </div>
    );

    return createPortal(popup, document.body);
  }
);

PopupPortal.displayName = 'PopupPortal';

export default PopupPortal;
