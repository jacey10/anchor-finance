import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';

const RefreshContext = createContext(null);

// --- Tunables ---
const THRESHOLD = 70;        // damped pull distance (px) needed to trigger a refresh
const MAX_PULL = 120;        // visual cap for the damped pull distance
const DAMPING = 0.55;        // finger distance -> visual distance (resistance feel)
const CIRCLE_SIZE = 40;      // diameter of the indicator circle
const PARK_OFFSET = 12;      // where the circle rests while loading (px from top of content)
const MIN_SPIN_MS = 600;     // keep the spinner visible long enough to be seen on fast loads

// --- Icons ---
// Down arrow: points down while pulling, flips up once the threshold is passed
const ArrowIcon = ({ ready }) => (
  <svg
    width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="var(--accent-gold)" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{
      transform: `rotate(${ready ? 180 : 0}deg)`,
      transition: 'transform 0.2s ease',
    }}
  >
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="var(--accent-gold)" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: 'ptr-spin 0.9s linear infinite' }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// Walk up from the touched element to the nearest vertically scrollable ancestor.
// Falls back to the page itself. Needed because the scrolling element may be
// .main rather than window, and window.scrollY is always 0 in that case.
function getScrollParent(el) {
  while (el && el !== document.body && el !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export function PullToRefreshProvider({ children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const wrapperRef = useRef(null);
  const refreshActionRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const pullRef = useRef(0);
  const startRef = useRef({ x: 0, y: 0, active: false, pulling: false, scroller: null });

  // Screens register their refresh function here
  const registerRefresh = useCallback((action) => {
    refreshActionRef.current = action;
  }, []);

  const setPull = (value) => {
    pullRef.current = value;
    setPullDistance(value);
  };

  // Run the registered refresh. Always clears the indicator, even on failure.
  const triggerRefresh = useCallback(async () => {
    const action = refreshActionRef.current;
    if (!action || isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const startedAt = Date.now();

    try {
      await action();
    } catch (error) {
      console.error('Pull-to-refresh failed:', error);
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // --- Touch gesture ---
  useEffect(() => {
    const reset = () => {
      startRef.current = { x: 0, y: 0, active: false, pulling: false, scroller: null };
      setPull(0);
    };

    const handleTouchStart = (e) => {
      reset();

      // Ignore multi-touch, ignore while already refreshing,
      // and ignore screens that have not registered a refresh action.
      if (e.touches.length !== 1) return;
      if (isRefreshingRef.current) return;
      if (!refreshActionRef.current) return;

      // Only react to touches inside the content area (not the sidebar/tabs)
      if (!wrapperRef.current || !wrapperRef.current.contains(e.target)) return;

      const scroller = getScrollParent(e.target);
      if (scroller.scrollTop > 0) return; // not at the top, let it scroll normally

      startRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        active: true,
        pulling: false,
        scroller,
      };
    };

    const handleTouchMove = (e) => {
      const s = startRef.current;
      if (!s.active || e.touches.length !== 1) return;

      const dx = e.touches[0].clientX - s.x;
      const dy = e.touches[0].clientY - s.y;

      // Not a downward vertical drag, or the content scrolled: stand down
      if (!s.pulling) {
        if (Math.abs(dx) > Math.abs(dy) || dy <= 0 || s.scroller.scrollTop > 0) {
          if (dy < -5 || s.scroller.scrollTop > 0) s.active = false;
          return;
        }
        s.pulling = true;
      }

      if (dy <= 0) {
        setPull(0);
        return;
      }

      if (e.cancelable) e.preventDefault(); // block the browser's own overscroll/refresh
      setPull(Math.min(dy * DAMPING, MAX_PULL));
    };

    const handleTouchEnd = () => {
      const s = startRef.current;
      const shouldRefresh = s.pulling && pullRef.current >= THRESHOLD;
      reset();
      if (shouldRefresh) triggerRefresh();
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [triggerRefresh]);

  // --- Indicator position / look ---
  const isDragging = pullDistance > 0;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const ready = pullDistance >= THRESHOLD;

  let translateY;
  let opacity;
  if (isRefreshing) {
    translateY = PARK_OFFSET;
    opacity = 1;
  } else if (isDragging) {
    translateY = pullDistance - CIRCLE_SIZE;
    opacity = progress;
  } else {
    translateY = -CIRCLE_SIZE;
    opacity = 0;
  }

  return (
    <RefreshContext.Provider value={{ registerRefresh }}>
      <div ref={wrapperRef} style={{ position: 'relative', minHeight: '100%' }}>
        {children}

        {/* Floating circle: arrow while pulling, spinner while loading */}
        <div
          role="status"
          aria-live="polite"
          aria-label={isRefreshing ? 'Refreshing' : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            marginLeft: -CIRCLE_SIZE / 2,
            borderRadius: '50%',
            // Placeholder colours: swap for a darker shade of your card colour
            background: 'var(--ptr-bg, #1b2a44)',
            border: '1px solid var(--ptr-border, rgba(255,255,255,0.08))',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 50,
            opacity,
            transform: `translateY(${translateY}px)`,
            // No easing while the finger is moving, ease it back when released
            transition: isDragging
              ? 'none'
              : 'transform 0.25s ease, opacity 0.2s ease',
          }}
        >
          {isRefreshing ? <SpinnerIcon /> : isDragging ? <ArrowIcon ready={ready} /> : null}
        </div>
      </div>

      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] svg { animation-duration: 2s !important; }
        }
      `}</style>
    </RefreshContext.Provider>
  );
}

// Hook for screens to register their data-fetching logic.
// Pass a stable function (wrap it in useCallback) or this re-registers every render.
export function useRegisterRefresh(refreshAction) {
  const ctx = useContext(RefreshContext);
  const registerRefresh = ctx ? ctx.registerRefresh : null;

  useEffect(() => {
    if (!registerRefresh) return undefined;
    registerRefresh(refreshAction);
    // Clear on unmount so a screen that is gone can't be refreshed
    return () => registerRefresh(null);
  }, [refreshAction, registerRefresh]);
}