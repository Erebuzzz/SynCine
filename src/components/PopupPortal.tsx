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
  /** Background styling class (default: 'bg-black/95') */
  bgClass?: string;
  /** Border styling class (default: 'border-white/15') */
  borderClass?: string;
  /** Text styling class (default: 'text-white') */
  textClass?: string;
  /** Caret border color class (default: 'border-t-black/95' or 'border-b-black/95') */
  caretClass?: string;
  /** Stop click propagation inside the popup */
  stopPropagation?: boolean;
  children: ReactNode;
}

/**
 * Renders popup content into document.body via a React portal.
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
      bgClass = 'bg-black/95',
      borderClass = 'border-white/15',
      textClass = 'text-white',
      caretClass,
      stopPropagation = true,
      children,
    },
    ref
  ) => {
    if (!isOpen) return null;

    const defaultCaretClass = isFlipped ? 'border-b-black/95' : 'border-t-black/95';

    const popup = (
      <div
        ref={ref}
        style={style}
        className={`${widthClass} p-2 rounded-2xl ${bgClass} backdrop-blur-2xl border ${borderClass} shadow-2xl animate-enter-smooth select-none ${textClass} ${className}`}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {children}
        {/* Caret arrow pointing toward the trigger */}
        <div
          className={`absolute pointer-events-none ${isFlipped ? 'bottom-full' : 'top-full'}`}
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
