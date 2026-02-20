import { useRef, useCallback } from "react";

// ─── Gesture Hook ─── swipe, long-press, double-tap detection via pointer events ───

export default function useGestures({
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onDoubleTap,
  swipeThreshold = 80,
  longPressDelay = 600,
  doubleTapDelay = 300,
} = {}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const longPressTimer = useRef(null);
  const lastTapTime = useRef(0);
  const moved = useRef(false);
  const translateX = useRef(0);
  const elementRef = useRef(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      startX.current = e.clientX;
      startY.current = e.clientY;
      startTime.current = Date.now();
      moved.current = false;
      translateX.current = 0;

      // Long press detection
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          if (!moved.current) {
            onLongPress(e);
          }
        }, longPressDelay);
      }

      // Double tap detection
      if (onDoubleTap) {
        const now = Date.now();
        if (now - lastTapTime.current < doubleTapDelay) {
          onDoubleTap(e);
          lastTapTime.current = 0;
        } else {
          lastTapTime.current = now;
        }
      }
    },
    [onLongPress, onDoubleTap, longPressDelay, doubleTapDelay]
  );

  const onPointerMove = useCallback(
    (e) => {
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        moved.current = true;
        clearLongPress();
      }

      // Visual swipe feedback
      if ((onSwipeLeft || onSwipeRight) && Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        translateX.current = dx * 0.6;
        if (elementRef.current) {
          elementRef.current.style.transform = `translateX(${translateX.current}px)`;
          elementRef.current.style.transition = "none";
        }
      }
    },
    [onSwipeLeft, onSwipeRight, clearLongPress]
  );

  const onPointerUp = useCallback(
    (e) => {
      clearLongPress();
      const dx = e.clientX - startX.current;

      // Reset visual position
      if (elementRef.current) {
        elementRef.current.style.transform = "translateX(0)";
        elementRef.current.style.transition = "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
      }

      if (moved.current && Math.abs(dx) >= swipeThreshold) {
        if (dx > 0 && onSwipeRight) {
          onSwipeRight(e);
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft(e);
        }
      }

      translateX.current = 0;
    },
    [onSwipeLeft, onSwipeRight, swipeThreshold, clearLongPress]
  );

  const onPointerCancel = useCallback(() => {
    clearLongPress();
    if (elementRef.current) {
      elementRef.current.style.transform = "translateX(0)";
      elementRef.current.style.transition = "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
    }
  }, [clearLongPress]);

  return {
    ref: elementRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
