import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';

interface AnchoredPopupOptions {
  /** Horizontal alignment relative to the trigger. Default: 'center' */
  align?: 'center' | 'left';
  /** Gap between the trigger and the popup in px. Default: 12 */
  gap?: number;
  /** Minimum distance from viewport edges in px. Default: 8 */
  edgePadding?: number;
}

interface PopupPosition {
  top: number;
  left: number;
  caretLeft: number;
  isFlipped: boolean;
}

/**
 * Calculates fixed-position coordinates for a popup anchored above (or below) a trigger element.
 * Uses getBoundingClientRect() and ResizeObserver so it works regardless of stacking context,
 * overflow:hidden, or CSS transforms on ancestor elements.
 */
export function useAnchoredPopup(
  isOpen: boolean,
  options: AnchoredPopupOptions = {}
) {
  const { align = 'center', gap = 12, edgePadding = 8 } = options;

  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const recalculate = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Check if there is enough room above; flip below if constrained
    let top = triggerRect.top - popupRect.height - gap;
    let isFlipped = false;
    if (top < edgePadding && triggerRect.bottom + popupRect.height + gap <= viewportH - edgePadding) {
      top = triggerRect.bottom + gap;
      isFlipped = true;
    } else if (top < edgePadding) {
      top = edgePadding;
    }

    // Horizontal positioning
    let left: number;
    if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - popupRect.width / 2;
    } else {
      left = triggerRect.left;
    }

    // Clamp to viewport edges
    const maxLeft = viewportW - popupRect.width - edgePadding;
    if (left < edgePadding) left = edgePadding;
    if (left > maxLeft) left = maxLeft;

    // Caret points at trigger center, clamped inside popup bounds
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    let caretLeft = triggerCenter - left;
    const minCaret = 16;
    const maxCaret = Math.max(minCaret, popupRect.width - 16);
    if (caretLeft < minCaret) caretLeft = minCaret;
    if (caretLeft > maxCaret) caretLeft = maxCaret;

    setPosition({ top, left, caretLeft, isFlipped });
  }, [align, gap, edgePadding]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const raf = requestAnimationFrame(recalculate);

    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate, true);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        recalculate();
      });
      if (popupRef.current) resizeObserver.observe(popupRef.current);
      if (triggerRef.current) resizeObserver.observe(triggerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate, true);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isOpen, recalculate]);

  const popupStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }
    : {
        position: 'fixed',
        top: -9999,
        left: -9999,
        zIndex: 9999,
        visibility: 'hidden' as const,
      };

  return {
    triggerRef,
    popupRef,
    popupStyle,
    caretLeft: position?.caretLeft ?? 0,
    isFlipped: position?.isFlipped ?? false,
    recalculate,
  };
}

/**
 * Variant that accepts an externally managed trigger ref.
 */
export function useAnchoredPopupWithRef(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: AnchoredPopupOptions = {}
) {
  const { align = 'center', gap = 12, edgePadding = 8 } = options;

  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const recalculate = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = triggerRect.top - popupRect.height - gap;
    let isFlipped = false;
    if (top < edgePadding && triggerRect.bottom + popupRect.height + gap <= viewportH - edgePadding) {
      top = triggerRect.bottom + gap;
      isFlipped = true;
    } else if (top < edgePadding) {
      top = edgePadding;
    }

    let left: number;
    if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - popupRect.width / 2;
    } else {
      left = triggerRect.left;
    }

    const maxLeft = viewportW - popupRect.width - edgePadding;
    if (left < edgePadding) left = edgePadding;
    if (left > maxLeft) left = maxLeft;

    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    let caretLeft = triggerCenter - left;
    const minCaret = 16;
    const maxCaret = Math.max(minCaret, popupRect.width - 16);
    if (caretLeft < minCaret) caretLeft = minCaret;
    if (caretLeft > maxCaret) caretLeft = maxCaret;

    setPosition({ top, left, caretLeft, isFlipped });
  }, [triggerRef, align, gap, edgePadding]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const raf = requestAnimationFrame(recalculate);

    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate, true);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        recalculate();
      });
      if (popupRef.current) resizeObserver.observe(popupRef.current);
      if (triggerRef.current) resizeObserver.observe(triggerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate, true);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isOpen, recalculate]);

  const popupStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }
    : {
        position: 'fixed',
        top: -9999,
        left: -9999,
        zIndex: 9999,
        visibility: 'hidden' as const,
      };

  return {
    popupRef,
    popupStyle,
    caretLeft: position?.caretLeft ?? 0,
    isFlipped: position?.isFlipped ?? false,
    recalculate,
  };
}
